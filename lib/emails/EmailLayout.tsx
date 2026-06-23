import * as React from 'react'

/**
 * Shared branded shell for all ResearchDesk Pro emails.
 * Dark navy (#080C18) + gold (#c9943a) + cream (#f0e8d0), table-based for
 * email-client compatibility. Use the H1 / P / CTA helpers for consistency.
 */
export function EmailShell({ children, unsubscribeUrl }: { children: React.ReactNode; unsubscribeUrl?: string }) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{
        margin: 0, padding: 0,
        backgroundColor: '#080C18',
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>
        <table width="100%" cellPadding={0} cellSpacing={0} style={{ backgroundColor: '#080C18', padding: '40px 20px' }}>
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
                    padding: '26px 40px', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 16, color: '#c9943a', marginBottom: 6, lineHeight: 1 }}>✦</div>
                    <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.04em', color: '#f0e8d0' }}>
                      Research<span style={{ color: '#c9943a' }}>Desk</span>
                      <span style={{ color: 'rgba(201,148,58,0.5)', fontSize: 12, fontWeight: 500, marginLeft: 6 }}>Pro</span>
                    </div>
                  </td>
                </tr>

                {/* Body */}
                <tr>
                  <td style={{ padding: '36px 40px 28px' }}>{children}</td>
                </tr>

                {/* Footer */}
                <tr>
                  <td style={{ padding: '20px 40px', borderTop: '1px solid rgba(201,148,58,0.08)', textAlign: 'center' }}>
                    <p style={{ fontSize: 12, color: 'rgba(200,175,130,0.3)', margin: 0, lineHeight: 1.6 }}>
                      You&apos;re receiving this because you signed up for ResearchDesk Pro.<br />
                      <a href="https://researchdeskpro.com" style={{ color: 'rgba(201,148,58,0.4)', textDecoration: 'none' }}>
                        researchdeskpro.com
                      </a>
                      {unsubscribeUrl ? (
                        <>
                          {' · '}
                          <a href={unsubscribeUrl} style={{ color: 'rgba(200,175,130,0.3)', textDecoration: 'underline' }}>
                            Unsubscribe
                          </a>
                        </>
                      ) : null}
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

export const H1 = ({ children }: { children: React.ReactNode }) => (
  <p style={{ fontSize: 22, fontWeight: 700, color: '#f0e8d0', margin: '0 0 14px', lineHeight: 1.3 }}>{children}</p>
)

export const P = ({ children }: { children: React.ReactNode }) => (
  <p style={{ fontSize: 15, color: 'rgba(200,175,130,0.75)', margin: '0 0 18px', lineHeight: 1.7 }}>{children}</p>
)

export const Accent = ({ children }: { children: React.ReactNode }) => (
  <span style={{ color: '#c9943a', fontWeight: 700 }}>{children}</span>
)

export const CTA = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <table width="100%" cellPadding={0} cellSpacing={0} style={{ margin: '26px 0 8px' }}>
    <tr>
      <td align="center">
        <a href={href} style={{
          display: 'inline-block',
          background: 'linear-gradient(135deg, #e0b545 0%, #a06808 100%)',
          color: '#0a0600', padding: '14px 36px', borderRadius: 10,
          fontSize: 14, fontWeight: 800, textDecoration: 'none', letterSpacing: '0.01em',
        }}>
          {children}
        </a>
      </td>
    </tr>
  </table>
)
