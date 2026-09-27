import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getFeed, settle } from '@/lib/data/queries'
import { formatRatio, topicName } from '@/lib/format'
import { ScoreBlock } from '../SignalScore'
import { TIME_TO_IMPACT_LABEL, STATUS_LABEL } from '@/lib/domain/labels'

function Annotation({ n, title, children }: { n: number; title: string; children: string }) {
  return (
    <li className="grid grid-cols-[1.25rem_1fr] gap-2">
      <span className="numeric flex size-5 items-center justify-center rounded-full border border-accent text-[10px] text-accent">{n}</span>
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs leading-relaxed text-ink-2">{children}</span>
      </span>
    </li>
  )
}

/** The anatomy of a signal, annotated using the current top-ranked item so the example is always real data from the feed. */
async function Specimen() {
  const feed = await settle(getFeed({ limit: 1 }))
  const top = feed.ok ? feed.value[0] : undefined
  if (!top) return null
  const marker = (n: number, pos: string) => (
    <span aria-hidden className={`numeric ${pos} flex size-4 items-center justify-center rounded-full bg-accent text-[9px] text-accent-ink`}>
      {n}
    </span>
  )
  return (
    <figure className="relative self-center">
      <figcaption className="meta mb-3 flex items-center justify-between">
        <span>How to read a signal</span>
        <span className="text-ink-3">Live example from the feed</span>
      </figcaption>
      <div className="rounded-sm border border-rule-strong bg-paper-raised p-5 shadow-[6px_6px_0_0_var(--a-rule)]">
        <div className="grid grid-cols-[4.5rem_1fr] gap-4">
          <div className="relative">
            {marker(1, "absolute -top-1 -left-4")}
            <ScoreBlock score={top.score} confidence={top.confidence} />
          </div>
          <div className="min-w-0">
            <p className="meta">
              {topicName(top.primaryTopic)} · {STATUS_LABEL[top.status]}
            </p>
            <p className="mt-1 font-serif text-lg leading-snug">
              <Link href={`/signals/${top.slug}`} className="hover:text-accent">
                {top.title}
              </Link>
            </p>
            <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-dashed border-rule pt-2">
              <div className="relative">
                <dt className="meta flex items-center gap-1 text-[10px]">{marker(2, "shrink-0")}Momentum</dt>
                <dd className="numeric text-sm text-accent">{formatRatio(top.momentumRatio)}</dd>
              </div>
              <div className="relative">
                <dt className="meta flex items-center gap-1 text-[10px]">{marker(3, "shrink-0")}Evidence</dt>
                <dd className="numeric text-sm">
                  {top.sourceCount} / {top.independentSourceCount} ind.
                </dd>
              </div>
              <div className="relative">
                <dt className="meta flex items-center gap-1 text-[10px]">{marker(4, "shrink-0")}Impact in</dt>
                <dd className="numeric text-sm">{TIME_TO_IMPACT_LABEL[top.timeToImpact]}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
      <ol className="mt-5 grid gap-3 sm:grid-cols-2">
        <Annotation n={1} title="Breakout Score">
          A 0–100 analytical ranking with a visible breakdown and hype penalty. Not a prediction.
        </Annotation>
        <Annotation n={2} title="Momentum">
          Latest period of activity divided by its own trailing four-period mean.
        </Annotation>
        <Annotation n={3} title="Evidence">
          How many sources back it, and how many are independent of the project.
        </Annotation>
        <Annotation n={4} title="Time to impact">
          When a typical team might act on it. Always labelled as an estimate.
        </Annotation>
      </ol>
    </figure>
  )
}

export function Hero() {
  return (
    <section aria-labelledby="hero-heading" className="grid-paper border-b border-rule">
      <div className="mx-auto grid max-w-page gap-12 px-4 pt-12 pb-14 sm:px-6 md:pt-20 lg:grid-cols-[1.25fr_1fr] lg:gap-16 lg:pb-20">
        <div className="flex flex-col justify-center">
          <p className="meta flex flex-wrap gap-x-2">
            <span className="text-ink">Developer intelligence</span>
            <span aria-hidden>/</span>
            <span>AI · Agents · Infrastructure · Security · Robotics · Quantum</span>
          </p>
          <h1 id="hero-heading" className="mt-6 font-serif text-display font-medium tracking-display text-balance">
            The signals <em className="font-normal text-accent italic">before</em> the signals.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-2">
            Track emerging technologies, tools, research and infrastructure before they become mainstream developer knowledge.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#feed" className="btn-primary h-11 px-5">
              Explore today’s signals <ArrowRight aria-hidden className="size-4" />
            </a>
            <Link href="/radar" className="btn-secondary h-11 px-5">
              Build my radar
            </Link>
          </div>
          <dl className="mt-12 grid gap-6 border-t border-rule pt-6 text-sm sm:grid-cols-3">
            <div>
              <dt className="meta text-ink">What is a signal?</dt>
              <dd className="mt-1.5 text-ink-2">An observable technical change — a release, paper, integration or benchmark — with measurable momentum.</dd>
            </div>
            <div>
              <dt className="meta text-ink">Why a score?</dt>
              <dd className="mt-1.5 text-ink-2">To rank many changes by evidence, relevance and momentum, with hype penalised and every point explained.</dd>
            </div>
            <div>
              <dt className="meta text-ink">How to use it</dt>
              <dd className="mt-1.5 text-ink-2">Scan the feed, open “Why this score?”, check the sources. Save what matters; tune a radar to your topics.</dd>
            </div>
          </dl>
        </div>
        <Specimen />
      </div>
    </section>
  )
}
