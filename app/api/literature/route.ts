import { NextRequest, NextResponse } from 'next/server'

export interface LitArticle {
  id: string
  title: string
  authors: string
  journal: string
  date: string
  doi: string | null
  url: string
  pubtype: string
  volume: string
  issue: string
  pages: string
  source: 'pubmed' | 'semantic_scholar' | 'europe_pmc'
  openAccess: boolean
  pdfUrl: string | null
}

const TOOL  = 'researchdesk'
const EMAIL = 'hello@researchdesk.app'

// ── PubMed ────────────────────────────────────────────────────────────────────
async function searchPubMed(q: string, max: number): Promise<LitArticle[]> {
  try {
    const params = `tool=${TOOL}&email=${EMAIL}`
    const BASE   = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'

    const searchRes = await fetch(
      `${BASE}/esearch.fcgi?db=pubmed&retmode=json&retmax=${max}&sort=relevance&term=${encodeURIComponent(q)}&${params}`,
      { next: { revalidate: 600 } }
    )
    if (!searchRes.ok) return []
    const searchData = await searchRes.json()
    const ids: string[] = searchData.esearchresult?.idlist || []
    if (!ids.length) return []

    const summaryRes = await fetch(
      `${BASE}/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(',')}&${params}`,
      { next: { revalidate: 600 } }
    )
    if (!summaryRes.ok) return []
    const summaryData = await summaryRes.json()
    const result = summaryData.result || {}

    return ids.map((id: string) => {
      const item = result[id]
      if (!item) return null
      const authors = (item.authors || [])
        .slice(0, 3).map((a: { name: string }) => a.name).join(', ')
        + (item.authors?.length > 3 ? ' et al.' : '')
      return {
        id: `pm_${id}`,
        title: item.title?.replace(/\.$/, '') || 'Untitled',
        authors,
        journal: item.fulljournalname || item.source || '',
        date: item.pubdate || '',
        doi: item.elocationid?.replace('doi: ', '') || null,
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
        pubtype: (item.pubtype || []).join(', '),
        volume: item.volume || '',
        issue: item.issue || '',
        pages: item.pages || '',
        source: 'pubmed' as const,
        openAccess: false,
        pdfUrl: null,
      }
    }).filter(Boolean) as LitArticle[]
  } catch { return [] }
}

// ── Semantic Scholar ──────────────────────────────────────────────────────────
async function searchSemanticScholar(q: string, max: number): Promise<LitArticle[]> {
  try {
    const fields = 'title,authors,year,venue,externalIds,openAccessPdf,publicationTypes,journal'
    const res = await fetch(
      `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(q)}&fields=${fields}&limit=${max}`,
      { next: { revalidate: 600 }, headers: { 'User-Agent': 'ResearchDesk/1.0 (hello@researchdesk.app)' } }
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.data || []).map((p: any) => {
      const authors = (p.authors || []).slice(0, 3).map((a: any) => a.name).join(', ')
        + (p.authors?.length > 3 ? ' et al.' : '')
      const doi = p.externalIds?.DOI || null
      const pmid = p.externalIds?.PubMed || null
      const url  = pmid
        ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
        : doi
          ? `https://doi.org/${doi}`
          : `https://www.semanticscholar.org/paper/${p.paperId}`
      return {
        id: `ss_${p.paperId}`,
        title: p.title || 'Untitled',
        authors,
        journal: p.journal?.name || p.venue || '',
        date: p.year ? String(p.year) : '',
        doi,
        url,
        pubtype: (p.publicationTypes || []).join(', '),
        volume: p.journal?.volume || '',
        issue: '',
        pages: p.journal?.pages || '',
        source: 'semantic_scholar' as const,
        openAccess: !!p.openAccessPdf,
        pdfUrl: p.openAccessPdf?.url || null,
      }
    }).filter((a: any) => a.title !== 'Untitled') as LitArticle[]
  } catch { return [] }
}

// ── Europe PMC ────────────────────────────────────────────────────────────────
async function searchEuropePMC(q: string, max: number): Promise<LitArticle[]> {
  try {
    const res = await fetch(
      `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(q)}&format=json&pageSize=${max}&resultType=core&sort=RELEVANCE`,
      { next: { revalidate: 600 } }
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.resultList?.result || []).map((p: any) => {
      const authors = p.authorString
        ? p.authorString.split(',').slice(0, 3).join(',').trim()
          + (p.authorString.split(',').length > 3 ? ' et al.' : '')
        : ''
      return {
        id: `epmc_${p.id}`,
        title: p.title?.replace(/\.$/, '') || 'Untitled',
        authors,
        journal: p.journalTitle || p.bookOrReportDetails?.publisher || '',
        date: p.pubYear ? String(p.pubYear) : '',
        doi: p.doi || null,
        url: p.pmid
          ? `https://pubmed.ncbi.nlm.nih.gov/${p.pmid}/`
          : p.doi
            ? `https://doi.org/${p.doi}`
            : `https://europepmc.org/article/${p.source}/${p.id}`,
        pubtype: p.pubTypeList?.pubType?.join(', ') || '',
        volume: p.journalInfo?.volume || '',
        issue: p.journalInfo?.issue || '',
        pages: p.pageInfo || '',
        source: 'europe_pmc' as const,
        openAccess: p.isOpenAccess === 'Y',
        pdfUrl: p.fullTextUrlList?.fullTextUrl?.find((u: any) => u.documentStyle === 'pdf')?.url || null,
      }
    }).filter((a: any) => a.title !== 'Untitled') as LitArticle[]
  } catch { return [] }
}

// ── Deduplicate by DOI then by title similarity ───────────────────────────────
function deduplicate(articles: LitArticle[]): LitArticle[] {
  const seenDoi  = new Set<string>()
  const seenTitle = new Set<string>()
  const result: LitArticle[] = []

  for (const a of articles) {
    const titleKey = a.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60)
    if (a.doi) {
      if (seenDoi.has(a.doi)) continue
      seenDoi.add(a.doi)
    }
    if (seenTitle.has(titleKey)) continue
    seenTitle.add(titleKey)
    result.push(a)
  }
  return result
}

// ── Route ─────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q   = searchParams.get('q') || ''
  const max = Math.min(parseInt(searchParams.get('max') || '10'), 20)

  if (!q.trim()) return NextResponse.json({ articles: [] })

  // Search all 3 sources in parallel
  const [pubmed, semantic, europepmc] = await Promise.all([
    searchPubMed(q, max),
    searchSemanticScholar(q, max),
    searchEuropePMC(q, max),
  ])

  // Interleave results (PubMed first, then alternate) then deduplicate
  const interleaved: LitArticle[] = []
  const maxLen = Math.max(pubmed.length, semantic.length, europepmc.length)
  for (let i = 0; i < maxLen; i++) {
    if (pubmed[i])   interleaved.push(pubmed[i])
    if (semantic[i]) interleaved.push(semantic[i])
    if (europepmc[i]) interleaved.push(europepmc[i])
  }

  const articles = deduplicate(interleaved)

  return NextResponse.json({
    articles,
    counts: { pubmed: pubmed.length, semantic_scholar: semantic.length, europe_pmc: europepmc.length, total: articles.length },
  })
}
