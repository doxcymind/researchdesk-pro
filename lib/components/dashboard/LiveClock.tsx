'use client'

import { useEffect, useState } from 'react'

export default function LiveClock() {
  const [now, setNow] = useState(new Date())
  const [tick, setTick] = useState(false)

  useEffect(() => {
    const id = setInterval(() => { setNow(new Date()); setTick(t => !t) }, 1000)
    return () => clearInterval(id)
  }, [])

  const h24  = now.getHours()
  const h12  = h24 % 12 || 12
  const min  = String(now.getMinutes()).padStart(2, '0')
  const ampm = h24 >= 12 ? 'PM' : 'AM'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 99, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <span style={{ fontSize: 16, fontWeight: 800, color: '#c9943a', fontFamily: "'Courier New', monospace", fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.5px' }}>
        {String(h12).padStart(2, '0')}
        <span style={{ color: tick ? '#c9943a' : 'rgba(201,148,58,0.2)', transition: 'color 0.15s' }}>:</span>
        {min}
      </span>
      <span style={{ fontSize: 11, color: 'rgba(240,232,208,0.35)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>{ampm}</span>
    </div>
  )
}
