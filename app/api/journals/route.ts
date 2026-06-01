export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q') || ''

  if (!query.trim()) {
    return Response.json({ results: [] })
  }

  try {
    // OpenAlex — free, no API key, 30K+ journals
    const url = `https://api.openalex.org/sources?search=${encodeURIComponent(query)}&filter=type:journal&per-page=20&sort=cited_by_count:desc&mailto=researchdesk@app.com`
    const res = await fetch(url, { next: { revalidate: 300 } })

    if (!res.ok) throw new Error('OpenAlex request failed')

    const json = await res.json()

    const results = (json.results || []).map((j: {
      display_name: string
      is_oa: boolean
      summary_stats?: { '2yr_mean_citedness'?: number; h_index?: number }
      works_count?: number
      host_organization_name?: string
      homepage_url?: string
      issn_l?: string
      issn?: string[]
    }) => ({
      name: j.display_name,
      openAccess: j.is_oa,
      impactFactor: j.summary_stats?.['2yr_mean_citedness']
        ? j.summary_stats['2yr_mean_citedness'].toFixed(1)
        : null,
      hIndex: j.summary_stats?.h_index || null,
      worksCount: j.works_count || 0,
      publisher: j.host_organization_name || null,
      url: j.homepage_url || null,
      issn: j.issn_l || j.issn?.[0] || null,
    }))

    return Response.json({ results })
  } catch (error) {
    console.error('Journal search error:', error)
    return Response.json({ error: 'Search failed' }, { status: 500 })
  }
}
