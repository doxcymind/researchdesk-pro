'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface Work {
  title: string
  year: string
  journal: string
  doi: string
}

interface Profile {
  orcid: string
  name: string
  affiliation: string
  country: string
  bio: string
  recentWorks: Work[]
  profileUrl: string
}

export default function OrcidProfile() {
  const [orcid, setOrcid]     = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [hovered, setHovered] = useState<number | null>(null)

  useEffect(() => {
    const run = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const id = (session?.user?.user_metadata?.orcid as string) || ''
        setOrcid(id)
        if (!id || !session) { setLoading(false); return }

        const res = await fetch(`/api/orcid?id=${encodeURIComponent(id)}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error || 'Could not load ORCID profile') }
        else { setProfile(data) }
      } catch {
        setError('Could not load ORCID profile')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  // Don't render anything while loading the very first time without an ORCID
  if (loading) {
    return (
      <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="skel" style={{ height: 90, borderRadius: 16 }} />
      </div>
    )
  }

  // No ORCID saved → gentle prompt to add one
  if (!orcid) {
    return (
      <div style={{ marginTop: 40 }}>
        <div style={{
          padding: '22px 24px', borderRadius: 16,
          background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(201,148,58,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
        }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#f0e8d0', margin: '0 0 4px', fontFamily: "var(--font-cinzel), 'Cormorant Garamond', Georgia, serif" }}>
              🆔 Connect your ORCID iD
            </p>
            <p style={{ fontSize: 12, color: 'rgba(240,232,208,0.35)', margin: 0 }}>
              Add your ORCID iD to showcase your profile and published works here.
            </p>
          </div>
          <Link href="/profile" style={{
            fontSize: 12, fontWeight: 700, color: '#c9943a', textDecoration: 'none',
            padding: '9px 20px', borderRadius: 9, border: '1px solid rgba(201,148,58,0.3)',
            background: 'rgba(201,148,58,0.08)', whiteSpace: 'nowrap',
          }}>
            Add in Profile →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginTop: 40 }}>

      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#a6ce39', boxShadow: '0 0 6px #a6ce39' }} />
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#f0e8d0', margin: 0, fontFamily: "var(--font-cinzel), 'Cormorant Garamond', Georgia, serif" }}>
              Your Publications
            </h2>
          </div>
          <p style={{ fontSize: 11, color: 'rgba(240,232,208,0.25)', margin: '4px 0 0 16px' }}>
            {profile?.name ? `${profile.name}` : 'From your ORCID record'}
            {profile?.affiliation ? ` · ${profile.affiliation}` : ''}
          </p>
          {/* Official ORCID iD badge */}
          <a
            href={profile?.profileUrl || `https://orcid.org/${orcid}`}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              margin: '8px 0 0 16px', padding: '3px 10px 3px 4px', borderRadius: 99,
              background: 'rgba(166,206,57,0.08)', border: '1px solid rgba(166,206,57,0.25)',
              textDecoration: 'none', transition: 'all 0.18s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(166,206,57,0.15)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(166,206,57,0.08)')}
          >
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 16, height: 16, borderRadius: '50%', background: '#a6ce39',
              color: '#fff', fontSize: 9, fontWeight: 800, fontStyle: 'italic',
              fontFamily: "Georgia, serif", flexShrink: 0,
            }}>iD</span>
            <span style={{ fontSize: 11, color: 'rgba(240,232,208,0.6)', letterSpacing: '0.03em', fontFamily: "'Courier New', monospace" }}>
              orcid.org/{orcid}
            </span>
          </a>
        </div>
        <a
          href={profile?.profileUrl || `https://orcid.org/${orcid}`}
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: 11, color: 'rgba(201,148,58,0.5)', textDecoration: 'none', letterSpacing: '0.04em', transition: 'color 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#c9943a')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(201,148,58,0.5)')}
        >
          View ORCID →
        </a>
      </div>

      {/* Error / empty states */}
      {error ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(240,232,208,0.3)', fontSize: 13, borderRadius: 14, border: '1px dashed rgba(255,255,255,0.06)' }}>
          {error} · <Link href="/profile" style={{ color: '#c9943a' }}>Check your ORCID in Profile →</Link>
        </div>
      ) : !profile?.recentWorks?.length ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(240,232,208,0.2)', fontSize: 13, borderRadius: 14, border: '1px dashed rgba(255,255,255,0.06)' }}>
          No public works found on this ORCID record.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {profile.recentWorks.map((w, i) => {
            const isHovered = hovered === i
            const href = w.doi ? `https://doi.org/${w.doi}` : (profile.profileUrl || `https://orcid.org/${orcid}`)
            return (
              <a
                key={i}
                href={href}
                target="_blank"
                rel="noreferrer"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                  padding: '14px 16px', borderRadius: 14, textDecoration: 'none',
                  background: isHovered ? 'rgba(201,148,58,0.05)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isHovered ? 'rgba(201,148,58,0.2)' : 'rgba(255,255,255,0.06)'}`,
                  transition: 'all 0.18s',
                  animation: `fadeInUp 0.35s ${i * 0.04}s both`,
                }}
              >
                {/* Index */}
                <span style={{
                  fontSize: 11, color: 'rgba(201,148,58,0.3)', fontWeight: 700,
                  fontFamily: "'Courier New', monospace", minWidth: 20, paddingTop: 2, flexShrink: 0,
                }}>
                  {String(i + 1).padStart(2, '0')}
                </span>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: 13, fontWeight: 500, color: isHovered ? '#f0e8d0' : 'rgba(240,232,208,0.75)',
                    margin: '0 0 6px', lineHeight: 1.45,
                    overflow: 'hidden', display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    transition: 'color 0.18s',
                  }}>
                    {w.title}
                  </p>
                  {w.journal && (
                    <span style={{ fontSize: 11, color: 'rgba(201,148,58,0.5)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block', maxWidth: 320 }}>
                      {w.journal}
                    </span>
                  )}
                </div>

                {/* Right meta */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                  {w.year && (
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', color: 'rgba(240,232,208,0.45)', whiteSpace: 'nowrap' }}>
                      {w.year}
                    </span>
                  )}
                  {w.doi && (
                    <span style={{ fontSize: 10, color: 'rgba(240,232,208,0.2)', whiteSpace: 'nowrap' }}>DOI</span>
                  )}
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
