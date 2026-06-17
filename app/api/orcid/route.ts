import { getAuthUser } from '@/lib/auth-helper'

const ORCID_BASE = 'https://pub.orcid.org/v3.0'

function yr(date: any): string {
  return date?.year?.value || ''
}

// Parses the shared "affiliation-group" structure used by educations,
// employments, qualifications, distinctions, memberships, services, invited-positions.
function parseAffiliations(section: any, summaryKey: string) {
  return (section?.['affiliation-group'] || []).map((g: any) => {
    const s = g.summaries?.[0]?.[summaryKey] || {}
    return {
      organization: s.organization?.name || '',
      role:         s['role-title'] || '',
      department:   s['department-name'] || '',
      startYear:    yr(s['start-date']),
      endYear:      yr(s['end-date']),
    }
  }).filter((e: any) => e.organization)
}

export async function GET(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const orcid = searchParams.get('id')?.trim()
  if (!orcid) return Response.json({ error: 'Provide id param' }, { status: 400 })

  if (!/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(orcid)) {
    return Response.json({ error: 'Invalid ORCID format. Use: 0000-0000-0000-0000' }, { status: 400 })
  }

  try {
    const recRes = await fetch(`${ORCID_BASE}/${orcid}/record`, { headers: { 'Accept': 'application/json' } })
    if (!recRes.ok) return Response.json({ error: 'ORCID profile not found or private' }, { status: 404 })
    const rec = await recRes.json()

    const person = rec.person || {}
    const act    = rec['activities-summary'] || {}

    const firstName = person.name?.['given-names']?.value || ''
    const lastName  = person.name?.['family-name']?.value || ''
    const creditName = person.name?.['credit-name']?.value || ''
    const bio       = person.biography?.content || ''
    const country   = person.addresses?.address?.[0]?.country?.value || ''

    const otherNames: string[] = (person['other-names']?.['other-name'] || []).map((n: any) => n.content).filter(Boolean)
    const keywords: string[] = (person.keywords?.keyword || []).map((k: any) => k.content).filter(Boolean)

    const links = (person['researcher-urls']?.['researcher-url'] || []).map((u: any) => ({
      name: u['url-name'] || u.url?.value || 'Link',
      url:  u.url?.value || '',
    })).filter((l: any) => l.url)

    const externalIds = (person['external-identifiers']?.['external-identifier'] || []).map((e: any) => ({
      type:  e['external-id-type'] || '',
      value: e['external-id-value'] || '',
      url:   e['external-id-url']?.value || '',
    })).filter((e: any) => e.value)

    const employments  = parseAffiliations(act.employments, 'employment-summary')
    const educations   = parseAffiliations(act.educations, 'education-summary')
    const qualifications = parseAffiliations(act.qualifications, 'qualification-summary')
    const distinctions = parseAffiliations(act.distinctions, 'distinction-summary')
    const memberships  = parseAffiliations(act.memberships, 'membership-summary')
    const services     = parseAffiliations(act.services, 'service-summary')
    const invitedPositions = parseAffiliations(act['invited-positions'], 'invited-position-summary')

    const fundings = (act.fundings?.group || []).map((g: any) => {
      const s = g['funding-summary']?.[0] || {}
      return {
        title:        s.title?.title?.value || '',
        organization: s.organization?.name || '',
        type:         s.type || '',
        startYear:    yr(s['start-date']),
        endYear:      yr(s['end-date']),
      }
    }).filter((f: any) => f.title || f.organization)

    const peerReviewCount = (act['peer-reviews']?.group || [])
      .reduce((sum: number, g: any) => sum + (g['peer-review-group']?.length || 1), 0)

    const affiliation = employments[0]?.organization || educations[0]?.organization || ''
    const role = employments[0]?.role || ''

    // ORCID-verified works (often a subset; OpenAlex is used as the primary source on the client)
    const works = (act.works?.group || []).map((g: any) => {
      const ws = g['work-summary']?.[0]
      return {
        title:   ws?.title?.title?.value || '',
        year:    yr(ws?.['publication-date']),
        journal: ws?.['journal-title']?.value || '',
        type:    ws?.type || '',
        doi:     ws?.['external-ids']?.['external-id']?.find((e: any) => e['external-id-type'] === 'doi')?.['external-id-value'] || '',
      }
    }).filter((w: any) => w.title)
      .sort((a: any, b: any) => (parseInt(b.year) || 0) - (parseInt(a.year) || 0))

    return Response.json({
      orcid,
      name: creditName || `${firstName} ${lastName}`.trim(),
      firstName, lastName, otherNames,
      affiliation, role, country, bio,
      keywords, links, externalIds,
      employments, educations, qualifications,
      distinctions, memberships, services, invitedPositions,
      fundings, peerReviewCount,
      works,
      recentWorks: works.slice(0, 5), // kept for the dashboard summary card
      profileUrl: `https://orcid.org/${orcid}`,
    })
  } catch (e) {
    console.error('ORCID error:', e)
    return Response.json({ error: 'Failed to fetch ORCID profile' }, { status: 500 })
  }
}
