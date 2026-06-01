import { getAuthUser } from '@/lib/auth-helper'
import { isScholarServer } from '@/lib/check-subscription'
// Import from lib path directly to avoid pdf-parse's test runner
// which tries to load @napi-rs/canvas — unavailable in Vercel serverless
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse/lib/pdf-parse.js')

const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MB

export async function POST(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const scholar = await isScholarServer(user.id, user.email)
  if (!scholar) return Response.json({ error: 'Scholar plan required' }, { status: 403 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return Response.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) return Response.json({ error: 'No file provided' }, { status: 400 })

  if (file.size > MAX_FILE_BYTES) {
    return Response.json({ error: 'File too large (max 10 MB)' }, { status: 413 })
  }

  const name = file.name.toLowerCase()
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  try {
    let text = ''

    if (name.endsWith('.txt')) {
      text = buffer.toString('utf-8')

    } else if (name.endsWith('.pdf')) {
      const data = await pdfParse(buffer)
      text = data.text || ''

    } else if (name.endsWith('.docx') || name.endsWith('.doc')) {
      // Use the docx package already in dependencies to extract raw text
      // docx package is for creating, not reading — use mammoth-style manual extraction
      // DOCX is a ZIP; extract word/document.xml and strip tags
      const JSZip = (await import('jszip')).default
      const zip = await JSZip.loadAsync(buffer)
      const xmlFile = zip.file('word/document.xml')
      if (!xmlFile) throw new Error('Invalid DOCX file')
      const xml = await xmlFile.async('string')
      // Strip XML tags and decode entities
      text = xml
        .replace(/<w:p[ >][^>]*>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/\r\n|\r/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()

    } else {
      return Response.json({ error: 'Unsupported file type. Please upload a PDF, DOCX, or TXT file.' }, { status: 415 })
    }

    text = text.replace(/\s+/g, ' ').trim()

    if (!text || text.length < 50) {
      return Response.json({ error: 'Could not extract readable text from the file. Please try a different file or paste the text manually.' }, { status: 422 })
    }

    return Response.json({ text, charCount: text.length, wordCount: text.split(/\s+/).length })
  } catch (error) {
    console.error('File extraction error:', error)
    return Response.json({ error: 'Failed to extract text from file. Please try a different file or paste the text manually.' }, { status: 500 })
  }
}
