import { getAuthUser } from '@/lib/auth-helper'

const BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'

export async function GET(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')?.trim()
  if (!query) return Response.json({ results: [] })

  try {
    const searchRes = await fetch(
      `${BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=8&retmode=json&sort=relevance`
    )
    const searchData = await searchRes.json()
    const ids: string[] = searchData.esearchresult?.idlist || []
    if (!ids.length) return Response.json({ results: [] })

    const summaryRes = await fetch(
      `${BASE}/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`
    )
    const summaryData = await summaryRes.json()
    const uids: string[] = summaryData.result?.uids || []

    const results = uids.map((uid: string) => {
      const art = summaryData.result[uid]
      const authors = (art.authors || []).slice(0, 3).map((a: any) => a.name).join(', ')
      const moreAuthors = (art.authors?.length || 0) > 3 ? ' et al.' : ''
      return {
        pmid: uid,
        title: art.title?.replace(/\.$/, '') || '',
        authors: authors + moreAuthors,
        journal: art.fulljournalname || art.source || '',
        year: art.pubdate?.split(' ')[0] || '',
        doi: art.elocationid?.replace('doi: ', '') || '',
        url: `https://pubmed.ncbi.nlm.nih.gov/${uid}/`,
      }
    })

    return Response.json({ results })
  } catch (e) {
    console.error('PubMed search error:', e)
    return Response.json({ results: [] })
  }
}
