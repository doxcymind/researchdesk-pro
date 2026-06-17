'use client'

import { createRoot } from 'react-dom/client'
import { useState } from 'react'

const inter = "var(--font-inter),'DM Sans',system-ui,sans-serif"

/**
 * Imperatively shows a phone-number modal and resolves with a 10-digit Indian
 * mobile, or null if the user cancels. Lets openCashfreeCheckout collect a
 * phone (required by Cashfree for the mandate) without each call site needing
 * its own UI.
 */
export function promptForPhone(): Promise<string | null> {
  return new Promise(resolve => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)

    const close = (value: string | null) => {
      root.unmount()
      host.remove()
      resolve(value)
    }

    root.render(<PhoneModal onDone={close} />)
  })
}

function PhoneModal({ onDone }: { onDone: (value: string | null) => void }) {
  const [phone, setPhone] = useState('')
  const digits = phone.replace(/\D/g, '').replace(/^91/, '').replace(/^0/, '')
  const valid = /^[6-9]\d{9}$/.test(digits)

  return (
    <div
      onClick={() => onDone(null)}
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0d1120', border: '1px solid rgba(201,148,58,0.3)',
          borderRadius: 20, padding: '32px 28px', maxWidth: 400, width: '100%',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6)', position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, borderRadius: '20px 20px 0 0', background: 'linear-gradient(90deg, transparent, #c9943a, transparent)' }} />

        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#f0e8d0', margin: '0 0 8px', fontFamily: inter }}>
          Mobile number for payment
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(240,232,208,0.45)', margin: '0 0 20px', lineHeight: 1.6, fontFamily: inter }}>
          Your bank needs a mobile number to approve the auto-pay mandate. This is only for billing — your account stays signed in with Google.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <span style={{ fontSize: 14, color: 'rgba(240,232,208,0.5)', fontFamily: inter, padding: '12px 0' }}>+91</span>
          <input
            autoFocus
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && valid) onDone(digits) }}
            placeholder="98765 43210"
            maxLength={14}
            style={{
              flex: 1, padding: '12px 14px', borderRadius: 10,
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${valid ? 'rgba(201,148,58,0.4)' : 'rgba(255,255,255,0.1)'}`,
              color: '#f0e8d0', fontSize: 15, fontFamily: inter, outline: 'none',
            }}
          />
        </div>

        <button
          onClick={() => valid && onDone(digits)}
          disabled={!valid}
          style={{
            width: '100%', padding: '13px 0', borderRadius: 12,
            background: valid ? 'linear-gradient(135deg, #c9943a, #e8b84a)' : 'rgba(201,148,58,0.25)',
            color: '#080c18', fontSize: 14, fontWeight: 700,
            border: 'none', cursor: valid ? 'pointer' : 'not-allowed',
            fontFamily: inter, marginBottom: 10,
          }}
        >
          Continue to payment
        </button>
        <button
          onClick={() => onDone(null)}
          style={{ width: '100%', padding: '9px 0', borderRadius: 12, background: 'transparent', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(240,232,208,0.35)', fontSize: 13, cursor: 'pointer', fontFamily: inter }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
