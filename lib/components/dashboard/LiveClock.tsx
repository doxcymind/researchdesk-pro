'use client'

import { useEffect, useState } from 'react'

const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

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
  const sec  = String(now.getSeconds()).padStart(2, '0')
  const ampm = h24 >= 12 ? 'PM' : 'AM'
  const day  = DAYS[now.getDay()]
  const date = now.getDate()
  const mon  = MONTHS[now.getMonth()]
  const year = now.getFullYear()

  return (
    <div style={{
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginBottom: 36,
      padding: '0 2px',
    }}>
      {/* Time */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{
          fontSize: 'clamp(28px, 4vw, 40px)',
          fontWeight: 300,
          color: 'rgba(240,232,208,0.75)',
          fontFamily: "'Courier New', monospace",
          letterSpacing: '-1px',
        }}>
          {String(h12).padStart(2, '0')}
          <span style={{ color: tick ? 'rgba(201,148,58,0.7)' : 'rgba(201,148,58,0.2)', transition: 'color 0.15s', margin: '0 1px' }}>:</span>
          {min}
          <span style={{ color: tick ? 'rgba(201,148,58,0.7)' : 'rgba(201,148,58,0.2)', transition: 'color 0.15s', margin: '0 1px' }}>:</span>
          <span style={{ color: 'rgba(240,232,208,0.35)', fontSize: '0.65em' }}>{sec}</span>
        </span>
        <span style={{
          fontSize: 11, fontWeight: 500,
          color: 'rgba(201,148,58,0.5)',
          letterSpacing: '0.1em',
          fontFamily: "var(--font-inter), sans-serif",
          marginBottom: 2,
        }}>{ampm}</span>
      </div>

      {/* Date */}
      <p style={{
        fontSize: 12,
        color: 'rgba(240,232,208,0.25)',
        margin: 0,
        letterSpacing: '0.04em',
        fontFamily: "var(--font-inter), sans-serif",
      }}>
        {day}, {date} {mon} {year}
      </p>
    </div>
  )
}
