import { getAuthUser } from '@/lib/auth-helper'
import { rateLimit } from '@/lib/rate-limit'

export async function GET(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { allowed } = rateLimit(`${user.id}:doi`, 30, 60000)
  if (!allowed) return Response.json({ error: 'Rate limit exceeded.' }, { status: 429 })

  const doi = new URL(req.url).searchParams.get('doi') || ''
  const cleanDoi = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').trim()
  if (!cleanDoi) return Response.json({ error: 'DOI required' }, { status: 400 })

  try {
    const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`, {
      headers: { 'User-Agent': 'ResearchDesk/1.0 (mailto:support@researchdesk.app)' },
      next: { revalidate: 86400 },
    })
    if (!res.ok) return Response.json({ error: 'DOI not found' }, { status: 404 })
    const data = await res.json()
    const w = data.message

    // Authors
    const authors = (w.author || []).map((a: any) => ({
      given: a.given || '',
      family: a.family || '',
      orcid: a.ORCID ? a.ORCID.replace('http://orcid.org/', '').replace('https://orcid.org/', '') : '',
    }))

    // Year
    const year = w.published?.['date-parts']?.[0]?.[0]
      || w['published-print']?.['date-parts']?.[0]?.[0]
      || w['published-online']?.['date-parts']?.[0]?.[0]
      || null

    // Abstract — CrossRef wraps in JATS XML sometimes
    const rawAbstract = w.abstract || ''
    const abstract = rawAbstract.replace(/<[^>]+>/g, '').trim()

    // Vancouver citation
    const authorStr = authors.length === 0 ? ''
      : authors.length <= 6
        ? authors.map((a: any) => `${a.family} ${(a.given || '').split(' ').map((n: string) => n[0]).join('')}`).join(', ')
        : authors.slice(0, 6).map((a: any) => `${a.family} ${(a.given || '').split(' ').map((n: string) => n[0]).join('')}`).join(', ') + ', et al'

    const journalAbbr = w['short-container-title']?.[0] || w['container-title']?.[0] || ''
    const volume = w.volume || ''
    const issue = w.issue || ''
    const pages = w.page || ''
    const title = (Array.isArray(w.title) ? w.title[0] : w.title) || ''

    let vancouver = `${authorStr}. ${title}. ${journalAbbr}. ${year || ''}`
    if (volume) vancouver += `;${volume}`
    if (issue) vancouver += `(${issue})`
    if (pages) vancouver += `:${pages}`
    vancouver += `.`
    if (cleanDoi) vancouver += ` doi:${cleanDoi}`

    return Response.json({
      doi: cleanDoi,
      title,
      authors,
      year,
      journal: w['container-title']?.[0] || '',
      journalAbbr,
      volume,
      issue,
      pages,
      abstract,
      type: w.type || '',
      publisher: w.publisher || '',
      issn: w.ISSN?.[0] || '',
      url: w.URL || `https://doi.org/${cleanDoi}`,
      vancouver: vancouver.trim(),
      citedBy: w['is-referenced-by-count'] || 0,
    })
  } catch (e) {
    console.error(e)
    return Response.json({ error: 'Failed to resolve DOI' }, { status: 500 })
  }
}
