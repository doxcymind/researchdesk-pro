import { getAuthUser } from '@/lib/auth-helper'

export async function GET(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const orcid = searchParams.get('id')?.trim()
  if (!orcid) return Response.json({ error: 'Provide id param' }, { status: 400 })

  // Validate ORCID format: 0000-0000-0000-0000
  if (!/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(orcid)) {
    return Response.json({ error: 'Invalid ORCID format. Use: 0000-0000-0000-0000' }, { status: 400 })
  }

  try {
    const [personRes, worksRes] = await Promise.all([
      fetch(`https://pub.orcid.org/v3.0/${orcid}/person`, {
        headers: { 'Accept': 'application/json' },
      }),
      fetch(`https://pub.orcid.org/v3.0/${orcid}/works`, {
        headers: { 'Accept': 'application/json' },
      }),
    ])

    if (!personRes.ok) return Response.json({ error: 'ORCID profile not found or private' }, { status: 404 })

    const person = await personRes.json()
    const works  = worksRes.ok ? await worksRes.json() : null

    const firstName = person.name?.['given-names']?.value || ''
    const lastName  = person.name?.['family-name']?.value || ''
    const bio       = person.biography?.content || ''
    const affiliation = person.employments?.['affiliation-group']?.[0]
      ?.summaries?.[0]?.['employment-summary']?.organization?.name || ''
    const country = person.addresses?.address?.[0]?.country?.value || ''

    const recentWorks = (works?.group || []).slice(0, 5).map((g: any) => {
      const ws = g['work-summary']?.[0]
      return {
        title:   ws?.title?.title?.value || '',
        year:    ws?.['publication-date']?.year?.value || '',
        journal: ws?.['journal-title']?.value || '',
        doi:     ws?.['external-ids']?.['external-id']?.find((e: any) => e['external-id-type'] === 'doi')?.['external-id-value'] || '',
      }
    }).filter((w: any) => w.title)

    return Response.json({
      orcid,
      name:        `${firstName} ${lastName}`.trim(),
      firstName,
      lastName,
      affiliation,
      country,
      bio,
      recentWorks,
      profileUrl:  `https://orcid.org/${orcid}`,
    })
  } catch (e) {
    console.error('ORCID error:', e)
    return Response.json({ error: 'Failed to fetch ORCID profile' }, { status: 500 })
  }
}
