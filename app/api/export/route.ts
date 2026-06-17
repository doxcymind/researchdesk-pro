import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/auth-helper'
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, PageBreak,
  Table, TableRow, TableCell, WidthType, BorderStyle as BS,
  convertInchesToTwip, LineRuleType,
} from 'docx'
import { parse, HTMLElement as ParsedHTMLElement } from 'node-html-parser'

// ── Journal formatting profiles ──────────────────────────────
interface JournalFormat {
  font: string
  sizePt: number        // in points (12 = 12pt)
  lineSpacing: number   // in twips (240 = single, 480 = double)
  marginIn: number      // page margin in inches
  headingFont: string
  abstractItalic: boolean
}

const DEFAULT_FORMAT: JournalFormat = {
  font: 'Times New Roman', sizePt: 12, lineSpacing: 480,
  marginIn: 1, headingFont: 'Times New Roman', abstractItalic: false,
}

const JOURNAL_FORMATS: Record<string, JournalFormat> = {
  'JCDR':                              { font: 'Times New Roman', sizePt: 12, lineSpacing: 480, marginIn: 1,    headingFont: 'Times New Roman', abstractItalic: false },
  'BMJ Case Reports':                  { font: 'Arial',           sizePt: 12, lineSpacing: 480, marginIn: 0.98, headingFont: 'Arial',           abstractItalic: false },
  'Cureus':                            { font: 'Times New Roman', sizePt: 12, lineSpacing: 480, marginIn: 1,    headingFont: 'Times New Roman', abstractItalic: false },
  'Journal of Medical Case Reports':   { font: 'Times New Roman', sizePt: 11, lineSpacing: 480, marginIn: 1,    headingFont: 'Times New Roman', abstractItalic: false },
  'American Journal of Case Reports':  { font: 'Times New Roman', sizePt: 12, lineSpacing: 480, marginIn: 1,    headingFont: 'Times New Roman', abstractItalic: false },
  'Postgraduate Medical Journal':      { font: 'Times New Roman', sizePt: 12, lineSpacing: 480, marginIn: 1,    headingFont: 'Times New Roman', abstractItalic: false },
  'The Lancet':                        { font: 'Arial',           sizePt: 11, lineSpacing: 360, marginIn: 0.98, headingFont: 'Arial',           abstractItalic: true  },
  'NEJM':                              { font: 'Times New Roman', sizePt: 12, lineSpacing: 480, marginIn: 1,    headingFont: 'Times New Roman', abstractItalic: false },
  'PLOS ONE':                          { font: 'Arial',           sizePt: 11, lineSpacing: 480, marginIn: 1,    headingFont: 'Arial',           abstractItalic: false },
  'Indian Journal of Surgery':         { font: 'Times New Roman', sizePt: 12, lineSpacing: 480, marginIn: 1,    headingFont: 'Times New Roman', abstractItalic: false },
  'Annals of Surgery':                 { font: 'Times New Roman', sizePt: 12, lineSpacing: 480, marginIn: 1,    headingFont: 'Times New Roman', abstractItalic: false },
}

function getJournalFormat(targetJournal: string | null): JournalFormat {
  if (!targetJournal) return DEFAULT_FORMAT
  // Try exact match first, then partial
  const exact = JOURNAL_FORMATS[targetJournal]
  if (exact) return exact
  const partial = Object.keys(JOURNAL_FORMATS).find(k =>
    targetJournal.toLowerCase().includes(k.toLowerCase()) ||
    k.toLowerCase().includes(targetJournal.toLowerCase())
  )
  return partial ? JOURNAL_FORMATS[partial] : DEFAULT_FORMAT
}

// ── HTML → DOCX converter ────────────────────────────────────
function htmlToDocxChildren(html: string, fmt: JournalFormat): (TextRun)[] {
  if (!html?.trim()) return []
  const root = parse(html)
  return nodeToRuns(root, fmt, {})
}

interface RunStyle { bold?: boolean; italic?: boolean; underline?: boolean; superscript?: boolean }

function nodeToRuns(node: any, fmt: JournalFormat, style: RunStyle): TextRun[] {
  const runs: TextRun[] = []
  const size = fmt.sizePt * 2

  if (node.nodeType === 3) { // text node
    const text = node.rawText?.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&apos;/g, "'").replace(/&quot;/g, '"') || ''
    if (text) runs.push(new TextRun({
      text,
      font: fmt.font,
      size,
      bold: style.bold,
      italics: style.italic,
      underline: style.underline ? {} : undefined,
      superScript: style.superscript,
    }))
    return runs
  }

  const tag = node.tagName?.toLowerCase()
  const childStyle: RunStyle = {
    bold: style.bold || tag === 'strong' || tag === 'b',
    italic: style.italic || tag === 'em' || tag === 'i',
    underline: style.underline || tag === 'u',
    superscript: style.superscript || tag === 'sup',
  }

  for (const child of (node.childNodes || [])) {
    runs.push(...nodeToRuns(child, fmt, childStyle))
  }
  return runs
}

function htmlToDocxParagraphs(html: string, fmt: JournalFormat, section?: string): (Paragraph | Table)[] {
  if (!html?.trim()) return []
  const elements: (Paragraph | Table)[] = []
  const root = parse(html)
  const size = fmt.sizePt * 2
  const spacing = { line: fmt.lineSpacing, lineRule: LineRuleType.AUTO, after: 160 }

  const processNode = (node: any) => {
    const tag = node.tagName?.toLowerCase()

    if (!tag) return // text node at root level — wrap in paragraph

    if (tag === 'p') {
      const runs = nodeToRuns(node, fmt, {})
      if (runs.length > 0 || node.text?.trim()) {
        elements.push(new Paragraph({ spacing, children: runs.length ? runs : [new TextRun({ text: node.text || '', font: fmt.font, size })] }))
      }
      return
    }

    if (tag === 'ul') {
      for (const li of node.querySelectorAll('li')) {
        const runs = nodeToRuns(li, fmt, {})
        elements.push(new Paragraph({
          spacing,
          bullet: { level: 0 },
          children: runs.length ? runs : [new TextRun({ text: li.text || '', font: fmt.font, size })],
        }))
      }
      return
    }

    if (tag === 'ol') {
      node.querySelectorAll('li').forEach((li: any, idx: number) => {
        const runs = nodeToRuns(li, fmt, {})
        elements.push(new Paragraph({
          spacing,
          numbering: { reference: 'default-numbering', level: 0 },
          children: runs.length ? runs : [new TextRun({ text: li.text || '', font: fmt.font, size })],
        }))
      })
      return
    }

    if (tag === 'table') {
      const tableRows: TableRow[] = []
      const allRows = node.querySelectorAll('tr')
      allRows.forEach((tr: any, rowIdx: number) => {
        const cells: TableCell[] = []
        const cellNodes = tr.querySelectorAll('th, td')
        cellNodes.forEach((cell: any) => {
          const isHeader = cell.tagName?.toLowerCase() === 'th'
          const runs = nodeToRuns(cell, fmt, { bold: isHeader })
          cells.push(new TableCell({
            borders: {
              top:    { style: BS.SINGLE, size: 4, color: 'AAAAAA' },
              bottom: { style: BS.SINGLE, size: 4, color: 'AAAAAA' },
              left:   { style: BS.SINGLE, size: 4, color: 'AAAAAA' },
              right:  { style: BS.SINGLE, size: 4, color: 'AAAAAA' },
            },
            shading: isHeader ? { fill: 'F2F2F2' } : undefined,
            children: [new Paragraph({
              spacing: { after: 80 },
              children: runs.length ? runs : [new TextRun({ text: cell.text || '', font: fmt.font, size, bold: isHeader })],
            })],
          }))
        })
        if (cells.length > 0) tableRows.push(new TableRow({ children: cells }))
      })
      if (tableRows.length > 0) {
        elements.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows,
        }))
        elements.push(new Paragraph({ spacing: { after: 160 }, children: [] }))
      }
      return
    }

    // For any other block element, recurse into children
    for (const child of (node.childNodes || [])) processNode(child)
  }

  for (const child of root.childNodes) processNode(child)
  return elements
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { projectId, projectTitle, studyType, sections } = await req.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: project, error: projErr } = await supabase
      .from('projects').select('id, target_journal').eq('id', projectId).eq('user_id', user.id).single()
    if (projErr || !project) return NextResponse.json({ error: 'Project not found' }, { status: 403 })

    const fmt = getJournalFormat(project.target_journal)
    const size = fmt.sizePt * 2
    const marginTwips = convertInchesToTwip(fmt.marginIn)
    const spacing = { line: fmt.lineSpacing, lineRule: LineRuleType.AUTO, after: 160 }

    const { data: rows, error } = await supabase
      .from('project_sections').select('section, content')
      .eq('project_id', projectId).eq('user_id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const contentMap: Record<string, string> = {}
    for (const row of (rows || [])) contentMap[row.section] = row.content

    // Parse citations
    interface CitationEntry { text: string; style: string; input: string }
    let citations: CitationEntry[] = []
    try { if (contentMap['__citations__']) citations = JSON.parse(contentMap['__citations__']) } catch {}

    // AI citation placement (unchanged logic, but use plain text extracted from HTML)
    if (citations.length > 0) {
      const stripHtml = (h: string) => parse(h).text || ''
      const manuscriptText = sections.map((s: string) => `## ${s}\n${stripHtml(contentMap[s]?.trim() || '')}`).join('\n\n')
      const refList = citations.map((c, i) => `[${i + 1}] ${c.text}`).join('\n')
      const aiPrompt = `You are a scientific manuscript editor. Insert citation numbers into the manuscript text where each reference is relevant.\n\nREFERENCES:\n${refList}\n\nMANUSCRIPT:\n${manuscriptText}\n\nINSTRUCTIONS:\n- Insert citation numbers like [1], [2], [1,3] directly in the text where each reference supports a claim.\n- Do not change any wording — only insert citation numbers.\n- Return only the modified manuscript, preserving the ## Section headings.\n- If a reference does not fit anywhere, do not force it.`
      try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
          body: JSON.stringify({ model: 'llama3-70b-8192', messages: [{ role: 'user', content: aiPrompt }], temperature: 0.1, max_tokens: 8000 }),
        })
        if (groqRes.ok) {
          const groqData = await groqRes.json()
          const annotated = groqData.choices?.[0]?.message?.content || ''
          if (annotated) {
            const sectionRegex = /## (.+?)\n([\s\S]*?)(?=## |\s*$)/g
            let match; sectionRegex.lastIndex = 0
            while ((match = sectionRegex.exec(annotated)) !== null) {
              const sn = match[1].trim(); const sc = match[2].trim()
              if (contentMap[sn] !== undefined) contentMap[sn] = sc
            }
          }
        }
      } catch {}
    }

    // Parse authors
    interface Author { name: string; email: string; affiliation: string; orcid: string; corresponding: boolean }
    let authors: Author[] = []
    try { if (contentMap['__authors__']) authors = JSON.parse(contentMap['__authors__']) } catch {}

    const exportDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    const docChildren: (Paragraph | Table)[] = []

    // Journal notice
    if (project.target_journal) {
      docChildren.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [new TextRun({ text: `Formatted for: ${project.target_journal}`, size: 18, color: '888888', italics: true, font: fmt.font })],
      }))
      docChildren.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: `Font: ${fmt.font} ${fmt.sizePt}pt · ${fmt.lineSpacing === 480 ? 'Double' : '1.5×'} spacing`, size: 16, color: 'AAAAAA', font: fmt.font })],
      }))
    }

    // Title
    docChildren.push(new Paragraph({
      text: projectTitle,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }))

    // Subtitle
    docChildren.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({ text: studyType, bold: true, size: 24, color: '555555', font: fmt.font }),
        new TextRun({ text: '   ·   ', size: 24, color: '999999', font: fmt.font }),
        new TextRun({ text: exportDate, size: 22, color: '888888', font: fmt.font }),
      ],
    }))

    // Authors
    if (authors.length > 0) {
      const corresponding = authors.find(a => a.corresponding)
      const nameRuns = authors.flatMap((a, i) => [
        new TextRun({ text: a.name, bold: true, size: 24, font: fmt.font }),
        ...(a.corresponding ? [new TextRun({ text: '*', bold: true, size: 20, font: fmt.font })] : []),
        ...(i < authors.length - 1 ? [new TextRun({ text: ', ', size: 24, font: fmt.font })] : []),
      ])
      docChildren.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: nameRuns }))
      const uniqueAffiliations = [...new Set(authors.map(a => a.affiliation).filter(Boolean))]
      for (const aff of uniqueAffiliations) {
        docChildren.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: aff, size: 20, color: '555555', italics: true, font: fmt.font })] }))
      }
      if (corresponding) {
        docChildren.push(new Paragraph({
          alignment: AlignmentType.CENTER, spacing: { after: 160 },
          children: [
            new TextRun({ text: `*Corresponding author: `, size: 20, bold: true, font: fmt.font }),
            new TextRun({ text: corresponding.name, size: 20, font: fmt.font }),
            ...(corresponding.email ? [new TextRun({ text: ` <${corresponding.email}>`, size: 20, color: '555555', font: fmt.font })] : []),
          ],
        }))
      }
    }

    // Divider
    docChildren.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' } }, spacing: { after: 400 }, children: [] }))

    // Sections — parse HTML content
    for (const section of sections) {
      const rawContent = contentMap[section]?.trim() || ''

      docChildren.push(new Paragraph({
        text: section,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 160 },
      }))

      if (rawContent) {
        // If content looks like HTML (TipTap output), parse it
        const isHtml = rawContent.startsWith('<')
        if (isHtml) {
          const parsed = htmlToDocxParagraphs(rawContent, fmt, section)
          docChildren.push(...parsed)
        } else {
          // Legacy plain text
          const paras = rawContent.split(/\n\n+/)
          for (const para of paras) {
            const lines = para.split('\n').filter(Boolean)
            docChildren.push(new Paragraph({
              spacing,
              children: lines.map((line, i) => new TextRun({ text: line, break: i > 0 ? 1 : 0, size, font: fmt.font })),
            }))
          }
        }
      } else {
        docChildren.push(new Paragraph({
          spacing,
          children: [new TextRun({ text: '[Not yet written]', italics: true, color: '999999', size, font: fmt.font })],
        }))
      }

      // Keywords after Abstract
      if (section === 'Abstract' && contentMap['__keywords__']?.trim()) {
        docChildren.push(new Paragraph({
          spacing: { before: 160, after: 240 },
          children: [
            new TextRun({ text: 'Keywords: ', bold: true, size, font: fmt.font }),
            new TextRun({ text: contentMap['__keywords__'].trim(), size, italics: true, font: fmt.font }),
          ],
        }))
      }
    }

    // References
    if (citations.length > 0) {
      docChildren.push(new Paragraph({ text: 'References', heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }))
      citations.forEach((c, i) => {
        docChildren.push(new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({ text: `[${i + 1}] `, bold: true, size: size - 2, font: fmt.font }),
            new TextRun({ text: c.text, size: size - 2, font: fmt.font }),
          ],
        }))
      })
    }

    // Footer
    docChildren.push(new Paragraph({ children: [new PageBreak()] }))
    docChildren.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `Generated by ResearchDesk · ${exportDate}`, size: 18, color: 'AAAAAA', font: fmt.font })],
    }))

    const doc = new Document({
      numbering: {
        config: [{
          reference: 'default-numbering',
          levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 260 } } } }],
        }],
      },
      styles: {
        default: {
          document: { run: { font: fmt.font, size } },
        },
        paragraphStyles: [
          {
            id: 'Heading1', name: 'Heading 1',
            run: { font: fmt.headingFont, size: (fmt.sizePt + 2) * 2, bold: true, color: '000000' },
            paragraph: { spacing: { before: 400, after: 160 } },
          },
        ],
      },
      sections: [{
        properties: {
          page: {
            margin: { top: marginTwips, bottom: marginTwips, left: marginTwips, right: marginTwips },
          },
        },
        children: docChildren,
      }],
    })

    const buffer = await Packer.toBuffer(doc)

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${(projectTitle ?? 'manuscript').replace(/\s+/g, '_')}_manuscript.docx"`,
      },
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
