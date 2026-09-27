/** Inline SVG sparkline; the last point is marked. Decorative — the value it shows is also printed as text. */
export function Sparkline({ values, width = 96, height = 24, className = '' }: { values: number[]; width?: number; height?: number; className?: string }) {
  if (values.length < 2) return null
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const span = max - min || 1
  const step = width / (values.length - 1)
  const pts = values.map((v, i) => [i * step, height - 2 - ((v - min) / span) * (height - 4)] as const)
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const [lx, ly] = pts[pts.length - 1]!
  return (
    <svg aria-hidden viewBox={`0 0 ${width} ${height}`} width={width} height={height} className={`overflow-visible ${className}`}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.25" className="text-ink-3" vectorEffect="non-scaling-stroke" />
      <circle cx={lx} cy={ly} r="2.5" className="fill-accent" />
    </svg>
  )
}
