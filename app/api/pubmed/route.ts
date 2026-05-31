import { NextRequest, NextResponse } from 'next/server'

const BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'
const TOOL = 'researchdesk'
const EMAIL = 'hello@researchdesk.app'
const PARAMS = `tool=${TOOL}&email=${EMAIL}`

// Rotate through high-impact medical search terms to keep feed varied
const TOPICS = [
  'clinical trial[pt]',
  'systematic review[pt]',
  'meta-analysis[pt]',
  'randomized controlled trial[pt]',
]

export async function GET(req: NextRequest) {
  try {
    const topic = TOPICS[Math.floor(Date.now() / (1000 * 60 * 10)) % TOPICS.length] // rotate every 10 min

    // Step 1 — get 12 recent PubMed IDs
    const searchUrl = `${BASE}/esearch.fcgi?db=pubmed&retmode=json&retmax=12&sort=pub+date&term=${encodeURIComponent(topic)}&${PARAMS}`
    const searchRes = await fetch(searchUrl, { next: { revalidate: 600 } }) // cache 10 min
    if (!searchRes.ok) throw new Error('PubMed search failed')
    const searchData = await searchRes.json()
    const ids: string[] = searchData.esearchresult?.idlist || []
    if (!ids.length) return NextResponse.json({ articles: [] })

    // Step 2 — fetch summaries
    const summaryUrl = `${BASE}/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(',')}&${PARAMS}`
    const summaryRes = await fetch(summaryUrl, { next: { revalidate: 600 } })
    if (!summaryRes.ok) throw new Error('PubMed summary failed')
    const summaryData = await summaryRes.json()
    const result = summaryData.result || {}

    const articles = ids
      .map((id: string) => {
        const item = result[id]
        if (!item) return null
        const authors = (item.authors || [])
          .slice(0, 3)
          .map((a: { name: string }) => a.name)
          .join(', ') + (item.authors?.length > 3 ? ' et al.' : '')

        return {
          id,
          title: item.title?.replace(/\.$/, '') || 'Untitled',
          authors,
          journal: item.fulljournalname || item.source || '',
          date: item.pubdate || '',
          doi: item.elocationid?.replace('doi: ', '') || null,
          url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
          pubtype: (item.pubtype || []).join(', '),
        }
      })
      .filter(Boolean)

    return NextResponse.json({ articles, topic })
  } catch (err) {
    console.error('PubMed error:', err)
    return NextResponse.json({ articles: [] })
  }
}
