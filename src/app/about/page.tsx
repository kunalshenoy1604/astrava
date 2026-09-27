import type { Metadata } from 'next'
import Link from 'next/link'
import { Breadcrumbs } from '@/components/Breadcrumbs'

export const metadata: Metadata = {
  title: 'About',
  description:
    'Astrava is a developer intelligence platform that reduces information overload by ranking early technical signals by evidence. Early signals are not guaranteed outcomes.',
  alternates: { canonical: '/about' },
}

const PRINCIPLES: [string, string][] = [
  ['Evidence before narrative', 'A signal starts with something observable — a release, a paper with code, an integration, a benchmark. Commentary is context, not proof.'],
  ['Show the working', 'Every score has a visible breakdown. Every statement is tagged as fact, analysis or estimate, and facts link to sources.'],
  ['Say what is missing', 'When evidence is thin, the page says “insufficient evidence” rather than generating a plausible answer.'],
  ['Penalise hype', 'Superlatives, self-reported-only benchmarks and discussion without substance reduce a score.'],
  ['Early ≠ inevitable', 'Most early signals fade. The aim is to notice the few that matter while there is time to evaluate them calmly.'],
]

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-page px-4 pt-8 sm:px-6">
      <Breadcrumbs items={[{ name: 'Home', href: '/' }, { name: 'About', href: '/about' }]} />
      <article className="mt-6 max-w-3xl">
        <h1 className="font-serif text-4xl font-medium tracking-[-0.02em] sm:text-6xl">About Astrava</h1>
        <p className="mt-6 text-xl leading-relaxed text-ink-2">
          Astrava is a developer intelligence platform. It exists to reduce information overload: hundreds of technical changes ship
          every week, and only a handful will matter to the work you do. Astrava tracks developments that are gaining momentum and ranks
          them by the evidence behind them.
        </p>
        <p className="mt-4 text-[17px] leading-relaxed text-ink-2">
          It covers artificial intelligence, AI agents, foundation models, developer tools, AI infrastructure, open-source software,
          robotics, quantum computing, cybersecurity and computing infrastructure.
        </p>

        <h2 className="mt-14 border-t border-rule-strong pt-6 font-serif text-3xl font-medium">What it is not</h2>
        <p className="mt-4 text-[17px] leading-relaxed text-ink-2">
          Astrava does not predict the future. A Breakout Score is an analytical ranking derived from observable signals; it is not a
          forecast, a recommendation to adopt something, or a judgement of quality. <strong className="text-ink">Early signals are not
          guaranteed outcomes.</strong>
        </p>

        <h2 className="mt-14 border-t border-rule-strong pt-6 font-serif text-3xl font-medium">Principles</h2>
        <dl className="mt-6 grid gap-6">
          {PRINCIPLES.map(([t, d], i) => (
            <div key={t} className="grid gap-1 sm:grid-cols-[3rem_1fr]">
              <span className="numeric text-sm text-accent">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <dt className="font-serif text-xl">{t}</dt>
                <dd className="mt-1 text-ink-2">{d}</dd>
              </div>
            </div>
          ))}
        </dl>

        <h2 className="mt-14 border-t border-rule-strong pt-6 font-serif text-3xl font-medium">About the data on this deployment</h2>
        <p className="mt-4 text-[17px] leading-relaxed text-ink-2">
          When no database is connected, Astrava runs on a clearly labelled demo dataset: the projects, publishers and numbers are
          fictional, and source links point to placeholder pages on example.org. The bar at the top of every page says whether you are
          looking at demo or live data. Once connected, an hourly pipeline collects public data from official APIs and feeds; see the{' '}
          <Link href="/methodology" className="link">
            methodology
          </Link>{' '}
          for exactly how it is processed and scored.
        </p>
      </article>
    </div>
  )
}
