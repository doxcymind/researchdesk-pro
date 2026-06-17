import * as React from 'react'

interface WelcomeEmailProps {
  name?: string
}

export function WelcomeEmail({ name }: WelcomeEmailProps) {
  const firstName = name?.split(' ')[0] || 'Researcher'

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{
        margin: 0, padding: 0,
        backgroundColor: '#07090f',
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>
        <table width="100%" cellPadding={0} cellSpacing={0} style={{ backgroundColor: '#07090f', padding: '40px 20px' }}>
          <tr>
            <td align="center">
              <table width="600" cellPadding={0} cellSpacing={0} style={{
                maxWidth: 600, width: '100%',
                backgroundColor: '#0c0e18',
                borderRadius: 16,
                border: '1px solid rgba(201,148,58,0.15)',
                overflow: 'hidden',
              }}>

                {/* Header */}
                <tr>
                  <td style={{
                    background: 'linear-gradient(135deg, #0c0e18 0%, #15110a 100%)',
                    borderBottom: '1px solid rgba(201,148,58,0.2)',
                    padding: '32px 40px',
                    textAlign: 'center',
                  }}>
                    <div style={{
                      fontSize: 26, fontWeight: 700, letterSpacing: '0.04em',
                      color: '#f0e8d0',
                    }}>
                      Research<span style={{ color: '#c9943a' }}>Desk</span>
                      <span style={{ color: 'rgba(201,148,58,0.5)', fontSize: 13, fontWeight: 500, marginLeft: 6 }}>Pro</span>
                    </div>
                  </td>
                </tr>

                {/* Body */}
                <tr>
                  <td style={{ padding: '40px 40px 32px' }}>

                    <p style={{ fontSize: 22, fontWeight: 700, color: '#f0e8d0', margin: '0 0 12px', lineHeight: 1.3 }}>
                      Welcome, {firstName}. 👋
                    </p>
                    <p style={{ fontSize: 15, color: 'rgba(200,175,130,0.7)', margin: '0 0 32px', lineHeight: 1.7 }}>
                      You&apos;re now part of ResearchDesk Pro — the smartest way to write medical research.
                      Here&apos;s how to get started in the next 5 minutes.
                    </p>

                    {/* Steps */}
                    {[
                      { num: '01', title: 'Create your first project', desc: 'Choose your study type — case report, review article, RCT, and more. We\'ll set up the right sections automatically.' },
                      { num: '02', title: 'Search the literature', desc: 'PubMed, Semantic Scholar, and Europe PMC are all built in. Find and save references without leaving your workspace.' },
                      { num: '03', title: 'Get AI section review', desc: 'Write a section and hit "AI Mentor Review" — get instant, structured feedback like a senior colleague reading your draft.' },
                    ].map(step => (
                      <table key={step.num} width="100%" cellPadding={0} cellSpacing={0} style={{ marginBottom: 20 }}>
                        <tr>
                          <td width="48" valign="top">
                            <div style={{
                              width: 36, height: 36, borderRadius: 8,
                              background: 'rgba(201,148,58,0.12)',
                              border: '1px solid rgba(201,148,58,0.25)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, fontWeight: 700, color: '#c9943a',
                              letterSpacing: '0.05em', textAlign: 'center',
                              lineHeight: '36px',
                            }}>
                              {step.num}
                            </div>
                          </td>
                          <td style={{ paddingLeft: 14 }}>
                            <p style={{ fontSize: 14, fontWeight: 700, color: '#f0e8d0', margin: '0 0 4px' }}>{step.title}</p>
                            <p style={{ fontSize: 13, color: 'rgba(200,175,130,0.6)', margin: 0, lineHeight: 1.6 }}>{step.desc}</p>
                          </td>
                        </tr>
                      </table>
                    ))}

                    {/* CTA */}
                    <table width="100%" cellPadding={0} cellSpacing={0} style={{ marginTop: 36 }}>
                      <tr>
                        <td align="center">
                          <a href="https://researchdeskpro.com/dashboard" style={{
                            display: 'inline-block',
                            background: 'linear-gradient(135deg, #e0b545 0%, #a06808 100%)',
                            color: '#0a0600', padding: '14px 36px', borderRadius: 10,
                            fontSize: 14, fontWeight: 800, textDecoration: 'none',
                            letterSpacing: '0.01em',
                          }}>
                            Start Writing →
                          </a>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>

                {/* Footer */}
                <tr>
                  <td style={{
                    padding: '20px 40px',
                    borderTop: '1px solid rgba(201,148,58,0.08)',
                    textAlign: 'center',
                  }}>
                    <p style={{ fontSize: 12, color: 'rgba(200,175,130,0.3)', margin: 0, lineHeight: 1.6 }}>
                      ResearchDesk Pro · Built for the medical research community<br/>
                      <a href="https://researchdeskpro.com" style={{ color: 'rgba(201,148,58,0.4)', textDecoration: 'none' }}>
                        researchdeskpro.com
                      </a>
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  )
}
