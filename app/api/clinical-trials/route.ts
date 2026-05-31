import { getAuthUser } from '@/lib/auth-helper'
import { rateLimit } from '@/lib/rate-limit'

export async function GET(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { allowed } = rateLimit(`${user.id}:clinical-trials`, 20, 60000)
  if (!allowed) return Response.json({ error: 'Rate limit exceeded.' }, { status: 429 })

  const url = new URL(req.url)
  const query = url.searchParams.get('q') || ''
  const page = url.searchParams.get('page') || '1'
  if (!query.trim()) return Response.json({ studies: [], total: 0 })

  try {
    const apiUrl = new URL('https://clinicaltrials.gov/api/v2/studies')
    apiUrl.searchParams.set('query.term', query)
    apiUrl.searchParams.set('pageSize', '10')
    apiUrl.searchParams.set('pageToken', page === '1' ? '' : page)
    apiUrl.searchParams.set('fields', 'NCTId,BriefTitle,OfficialTitle,OverallStatus,Phase,StartDate,CompletionDate,EnrollmentCount,StudyType,Condition,InterventionName,BriefSummary,LeadSponsorName,LocationCountry')
    apiUrl.searchParams.set('format', 'json')

    const res = await fetch(apiUrl.toString(), {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 300 },
    })
    if (!res.ok) throw new Error(`CT.gov API error: ${res.status}`)
    const data = await res.json()

    const studies = (data.studies || []).map((s: any) => {
      const p = s.protocolSection
      const id = p?.identificationModule
      const status = p?.statusModule
      const desc = p?.descriptionModule
      const design = p?.designModule
      const arms = p?.armsInterventionsModule
      const sponsor = p?.sponsorCollaboratorsModule
      const locations = p?.contactsLocationsModule

      return {
        nctId: id?.nctId || '',
        title: id?.briefTitle || id?.officialTitle || 'Untitled',
        officialTitle: id?.officialTitle || '',
        status: status?.overallStatus || '',
        phase: design?.phases?.join(', ') || '',
        studyType: design?.studyType || '',
        startDate: status?.startDateStruct?.date || '',
        completionDate: status?.completionDateStruct?.date || '',
        enrollment: design?.enrollmentInfo?.count || null,
        conditions: p?.conditionsModule?.conditions || [],
        interventions: (arms?.interventions || []).map((i: any) => i.name).slice(0, 3),
        summary: desc?.briefSummary || '',
        sponsor: sponsor?.leadSponsor?.name || '',
        countries: [...new Set((locations?.locations || []).map((l: any) => l.country).filter(Boolean))].slice(0, 4),
      }
    })

    return Response.json({
      studies,
      total: data.totalCount || studies.length,
      nextPageToken: data.nextPageToken || null,
    })
  } catch (e) {
    console.error(e)
    return Response.json({ error: 'ClinicalTrials.gov search failed' }, { status: 500 })
  }
}
