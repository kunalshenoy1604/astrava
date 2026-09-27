import type { MetricSeries } from '@/lib/domain/types'
import { formatCompact, formatNumber, formatRatio, formatShortDate } from '@/lib/format'
import { MOMENTUM_BASELINE_PERIODS, momentumRatio } from '@/lib/scoring/model'

const W = 560
const H = 180
const PAD = { top: 16, right: 8, bottom: 28, left: 44 }

/**
 * Server-rendered SVG bar chart. The dashed line is the trailing baseline the
 * momentum ratio compares against; the accent bar is the latest period. A
 * data table follows for screen readers and crawlers.
 */
export function MomentumChart({ series, isMomentumSeries = true }: { series: MetricSeries; isMomentumSeries?: boolean }) {
  const pts = series.points
  const max = Math.max(...pts.map((p) => p.value), 1)
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const bw = innerW / pts.length
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH
  const baselinePts = pts.slice(Math.max(0, pts.length - 1 - MOMENTUM_BASELINE_PERIODS), pts.length - 1)
  const baseline = baselinePts.length ? baselinePts.reduce((s, p) => s + p.value, 0) / baselinePts.length : null
  const ratio = momentumRatio(series)
  const ticks = [0, max / 2, max]

  return (
    <figure className="min-w-0">
      <figcaption className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{series.label}</span>
        <span className="meta">
          {isMomentumSeries ? (
            <>
              Latest vs {MOMENTUM_BASELINE_PERIODS}-period mean: <span className="text-ink">{formatRatio(ratio)}</span>
            </>
          ) : (
            <>
              Latest: <span className="text-ink">{formatNumber(pts[pts.length - 1]!.value)}</span>
            </>
          )}
          {series.provenance === 'demo' ? <span className="ml-2 text-caution">Demo data</span> : <span className="ml-2">Measured</span>}
        </span>
      </figcaption>
      <div className="scroll-x">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto max-h-64 w-full min-w-[22rem]" role="img" aria-label={`${series.label}, ${pts.length} periods`}>
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="stroke-rule" strokeWidth="1" />
              <text x={PAD.left - 6} y={y(t) + 3} textAnchor="end" className="fill-ink-3 font-mono text-[10px]">
                {formatCompact(t)}
              </text>
            </g>
          ))}
          {pts.map((p, i) => {
            const last = i === pts.length - 1
            const h = Math.max(1, y(0) - y(p.value))
            return (
              <g key={p.date}>
                <rect
                  x={PAD.left + i * bw + bw * 0.18}
                  y={y(p.value)}
                  width={bw * 0.64}
                  height={h}
                  className={last ? 'fill-accent' : 'fill-ink-3/50'}
                />
                {i % 2 === pts.length % 2 || last ? (
                  <text x={PAD.left + i * bw + bw / 2} y={H - 10} textAnchor="middle" className="fill-ink-3 font-mono text-[10px]">
                    {formatShortDate(`${p.date}T00:00:00Z`)}
                  </text>
                ) : null}
              </g>
            )
          })}
          {isMomentumSeries && baseline !== null ? (
            <g>
              <line
                x1={PAD.left + (pts.length - 1 - baselinePts.length) * bw}
                x2={PAD.left + (pts.length - 1) * bw}
                y1={y(baseline)}
                y2={y(baseline)}
                className="stroke-ink"
                strokeWidth="1.25"
                strokeDasharray="4 3"
              />
              <text x={PAD.left + (pts.length - 1 - baselinePts.length) * bw + 2} y={y(baseline) - 5} className="fill-ink-2 font-mono text-[10px]">
                baseline {formatCompact(baseline)}
              </text>
            </g>
          ) : null}
        </svg>
      </div>
      <table className="sr-only">
        <caption>{series.label}</caption>
        <thead>
          <tr>
            <th scope="col">Period ending</th>
            <th scope="col">{series.unit}</th>
          </tr>
        </thead>
        <tbody>
          {pts.map((p) => (
            <tr key={p.date}>
              <td>{p.date}</td>
              <td>{formatNumber(p.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
