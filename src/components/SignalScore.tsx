import type { BreakoutScore } from '@/lib/domain/types'
import { BAND_LABEL, CONFIDENCE_LABEL } from '@/lib/domain/labels'

const TICKS = 20

/** 20-tick meter: each tick = 5 points. Filled ticks use the accent; the rest are rules. */
export function ScoreTicks({ score, className = '' }: { score: number; className?: string }) {
  const filled = Math.round((score / 100) * TICKS)
  return (
    <span aria-hidden className={`flex h-2.5 items-end gap-[2px] ${className}`}>
      {Array.from({ length: TICKS }, (_, i) => (
        <span
          key={i}
          className={`w-[3px] origin-bottom ${i < filled ? 'bg-accent' : 'bg-rule'} ${i % 5 === 4 ? 'h-full' : 'h-2/3'}`}
        />
      ))}
    </span>
  )
}

/** Compact score used in feeds. */
export function ScoreBlock({ score, confidence, size = 'md' }: { score: number; confidence?: BreakoutScore['confidence']['level']; size?: 'md' | 'lg' }) {
  return (
    <div className="flex flex-col gap-1" aria-label={`Breakout Score ${score} out of 100`}>
      <span className="meta text-[10px]">Breakout</span>
      <span className={`numeric leading-none font-medium tracking-tight text-ink ${size === 'lg' ? 'text-6xl' : 'text-4xl'}`}>{score}</span>
      <ScoreTicks score={score} className="mt-1" />
      {confidence ? <span className="meta mt-1 text-[10px]">{CONFIDENCE_LABEL[confidence].replace(' confidence', ' conf.')}</span> : null}
    </div>
  )
}

/** Large score panel for the signal page header. */
export function SignalScore({ score }: { score: BreakoutScore }) {
  return (
    <div className="flex items-end gap-5">
      <ScoreBlock score={score.total} size="lg" />
      <dl className="grid gap-1 pb-1 text-sm">
        <div>
          <dt className="sr-only">Band</dt>
          <dd className="font-medium">{BAND_LABEL[score.band]}</dd>
        </div>
        <div>
          <dt className="sr-only">Confidence</dt>
          <dd className="text-ink-2">{CONFIDENCE_LABEL[score.confidence.level]}</dd>
        </div>
        <div>
          <dt className="sr-only">Model</dt>
          <dd className="meta">{score.modelVersion}</dd>
        </div>
      </dl>
    </div>
  )
}
