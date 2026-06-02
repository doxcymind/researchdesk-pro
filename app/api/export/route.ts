import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthUser } from '@/lib/auth-helper'
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, PageBreak,
} from 'docx'

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
      .from('projects').select('id').eq('id', projectId).eq('user_id', user.id).single()
    if (projErr || !project) return NextResponse.json({ error: 'Project not found' }, { status: 403 })

    const { data: rows, error } = await supabase
      .from('project_sections').select('section, content')
      .eq('project_id', projectId).eq('user_id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const contentMap: Record<string, string> = {}
    for (const row of (rows || [])) contentMap[row.section] = row.content

    // AI Citation placement
    interface CitationEntry { text: string; style: string; input: string }
    let citations: CitationEntry[] = []
    try {
      if (contentMap['__citations__']) citations = JSON.parse(contentMap['__citations__'])
    } catch {}

    if (citations.length > 0) {
      // Build full manuscript text
      const manuscriptText = sections
        .map((s: string) => `## ${s}\n${contentMap[s]?.trim() || ''}`)
        .join('\n\n')

      // Build numbered reference list
      const refList = citations.map((c, i) => `[${i + 1}] ${c.text}`).join('\n')

      const aiPrompt = `You are a scientific manuscript editor. Insert citation numbers into the manuscript text where each reference is relevant.

REFERENCES:
${refList}

MANUSCRIPT:
${manuscriptText}

INSTRUCTIONS:
- Insert citation numbers like [1], [2], [1,3] directly in the text where each reference supports a claim.
- Do not change any wording — only insert citation numbers.
- Return only the modified manuscript, preserving the ## Section headings.
- If a reference does not fit anywhere, do not force it.`

      try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'llama3-70b-8192',
            messages: [{ role: 'user', content: aiPrompt }],
            temperature: 0.1,
            max_tokens: 8000,
          }),
        })

        if (groqRes.ok) {
          const groqData = await groqRes.json()
          const annotated = groqData.choices?.[0]?.message?.content || ''
          if (annotated) {
            // Parse annotated text back into contentMap sections
            // Regex defined outside exec loop so lastIndex resets cleanly each call
            const sectionRegex = /## (.+?)\n([\s\S]*?)(?=## |\s*$)/g
            let match
            sectionRegex.lastIndex = 0
            while ((match = sectionRegex.exec(annotated)) !== null) {
              const sectionName = match[1].trim()
              const sectionContent = match[2].trim()
              if (contentMap[sectionName] !== undefined) {
                contentMap[sectionName] = sectionContent
              }
            }
          }
        }
      } catch (aiErr) {
        console.error('AI citation placement failed, continuing without:', aiErr)
      }
    }

    // Parse authors if stored
    interface Author { name: string; email: string; affiliation: string; orcid: string; corresponding: boolean }
    let authors: Author[] = []
    try { if (contentMap['__authors__']) authors = JSON.parse(contentMap['__authors__']) } catch {}

    const exportDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

    const docChildren: Paragraph[] = []

    // Title
    docChildren.push(new Paragraph({
      text: projectTitle,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }))

    // Subtitle line
    docChildren.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({ text: studyType, bold: true, size: 24, color: '555555' }),
        new TextRun({ text: '   ·   ', size: 24, color: '999999' }),
        new TextRun({ text: exportDate, size: 22, color: '888888' }),
      ],
    }))

    // Authors block
    if (authors.length > 0) {
      const corresponding = authors.find(a => a.corresponding)

      // Author names line
      const nameRuns = authors.flatMap((a, i) => [
        new TextRun({ text: a.name, bold: true, size: 24 }),
        ...(a.corresponding ? [new TextRun({ text: '*', bold: true, size: 20 })] : []),
        ...(i < authors.length - 1 ? [new TextRun({ text: ', ', size: 24 })] : []),
      ])
      docChildren.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: nameRuns }))

      // Affiliations
      const uniqueAffiliations = [...new Set(authors.map(a => a.affiliation).filter(Boolean))]
      for (const aff of uniqueAffiliations) {
        docChildren.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [new TextRun({ text: aff, size: 20, color: '555555', italics: true })],
        }))
      }

      // ORCID iDs
      const withOrcid = authors.filter(a => a.orcid)
      for (const a of withOrcid) {
        docChildren.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [
            new TextRun({ text: `${a.name}: `, size: 18, color: '777777' }),
            new TextRun({ text: `https://orcid.org/${a.orcid}`, size: 18, color: 'A6CE39' }),
          ],
        }))
      }

      // Corresponding author
      if (corresponding) {
        docChildren.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 160 },
          children: [
            new TextRun({ text: `*Corresponding author: `, size: 20, bold: true }),
            new TextRun({ text: `${corresponding.name}`, size: 20 }),
            ...(corresponding.email ? [new TextRun({ text: ` <${corresponding.email}>`, size: 20, color: '555555' })] : []),
          ],
        }))
      }
    }

    // Divider space
    docChildren.push(new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' } },
      spacing: { after: 400 },
      children: [],
    }))

    // Sections
    for (const section of sections) {
      const body = contentMap[section]?.trim() || ''

      // Section heading
      docChildren.push(new Paragraph({
        text: section,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 160 },
      }))

      if (body) {
        // Split into paragraphs on double newline or single newline
        const paras = body.split(/\n\n+/)
        for (const para of paras) {
          const lines = para.split('\n').filter(Boolean)
          docChildren.push(new Paragraph({
            spacing: { after: 160 },
            children: lines.map((line, i) => new TextRun({
              text: line,
              break: i > 0 ? 1 : 0,
              size: 24,
            })),
          }))
        }
      } else {
        docChildren.push(new Paragraph({
          spacing: { after: 160 },
          children: [new TextRun({ text: '[Not yet written]', italics: true, color: '999999', size: 24 })],
        }))
      }

      // After Abstract: insert Keywords block if available
      if (section === 'Abstract' && contentMap['__keywords__']?.trim()) {
        docChildren.push(new Paragraph({
          spacing: { before: 160, after: 240 },
          children: [
            new TextRun({ text: 'Keywords: ', bold: true, size: 24 }),
            new TextRun({ text: contentMap['__keywords__'].trim(), size: 24, italics: true }),
          ],
        }))
      }
    }

    // References section
    if (citations.length > 0) {
      docChildren.push(new Paragraph({
        text: 'References',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }))
      citations.forEach((c, i) => {
        docChildren.push(new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({ text: `[${i + 1}] `, bold: true, size: 22 }),
            new TextRun({ text: c.text, size: 22 }),
          ],
        }))
      })
    }

    // Footer note
    docChildren.push(new Paragraph({ children: [new PageBreak()] }))
    docChildren.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `Generated by ResearchDesk · ${exportDate}`, size: 18, color: 'AAAAAA' })],
    }))

    const doc = new Document({
      styles: {
        default: {
          document: {
            run: { font: 'Times New Roman', size: 24 },
          },
        },
      },
      sections: [{ properties: {}, children: docChildren }],
    })

    const buffer = await Packer.toBuffer(doc)
    const uint8 = new Uint8Array(buffer)

    return new NextResponse(uint8, {
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
