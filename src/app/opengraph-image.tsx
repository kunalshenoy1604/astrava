import { ImageResponse } from 'next/og'

export const alt = 'Astrava — the signals before the signals'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: '#f3f0e8',
          color: '#17150f',
          backgroundImage: 'linear-gradient(to right, rgba(23,21,15,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(23,21,15,0.05) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 30, letterSpacing: 4, textTransform: 'uppercase' }}>
          <div style={{ width: 16, height: 16, borderRadius: 8, background: '#b3340d' }} />
          Astrava · Developer intelligence
        </div>
        <div style={{ display: 'flex', fontSize: 104, lineHeight: 1, letterSpacing: -3, maxWidth: 1000 }}>The signals before the signals.</div>
        <div style={{ display: 'flex', fontSize: 30, color: '#3f3b33' }}>
          Technical developments gaining momentum — ranked by evidence, with hype penalised.
        </div>
      </div>
    ),
    size,
  )
}
