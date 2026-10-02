import type { Metadata } from 'next'
import Link from 'next/link'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { JsonLd } from '@/components/JsonLd'
import { BUILDER } from '@/lib/builder'
import { absoluteUrl } from '@/lib/config'

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

        <section id="builder" aria-labelledby="builder-h" className="mt-14 scroll-mt-20 border-t border-rule-strong pt-6">
          <p className="meta">The mind behind Astrava</p>
          <h2 id="builder-h" className="mt-1 font-serif text-3xl font-medium">{BUILDER.name}</h2>
          <p className="meta mt-1 normal-case tracking-normal">
            {BUILDER.role} · {BUILDER.location}
          </p>
          <p className="mt-5 text-[17px] leading-relaxed text-ink">{BUILDER.summary}</p>
          {BUILDER.bio.map((p) => (
            <p key={p.slice(0, 20)} className="mt-4 text-[17px] leading-relaxed text-ink-2">
              {p}
            </p>
          ))}
          <p className="mt-6 border-l-2 border-accent pl-4 font-serif text-xl leading-snug">{BUILDER.why}</p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {BUILDER.focus.map((f) => (
              <li key={f} className="rounded-xs border border-rule px-2 py-1 text-sm">
                {f}
              </li>
            ))}
          </ul>
          <p className="mt-6 flex flex-wrap gap-3">
            <a href={BUILDER.linkedin} target="_blank" rel="noopener noreferrer me" className="btn-primary">
              LinkedIn
            </a>
            <a href={BUILDER.github} target="_blank" rel="noopener noreferrer me" className="btn-secondary">
              GitHub
            </a>
            <a href={BUILDER.site} target="_blank" rel="noopener noreferrer me" className="btn-secondary">
              Portfolio
            </a>
          </p>
          <JsonLd
            data={{
              '@context': 'https://schema.org',
              '@type': 'Person',
              name: BUILDER.name,
              jobTitle: BUILDER.role,
              description: BUILDER.summary,
              url: BUILDER.site,
              sameAs: [BUILDER.linkedin, BUILDER.github, BUILDER.site],
              knowsAbout: [...BUILDER.focus],
              mainEntityOfPage: absoluteUrl('/about#builder'),
            }}
          />
        </section>

        <h2 className="mt-14 border-t border-rule-strong pt-6 font-serif text-3xl font-medium">About the data on this deployment</h2>
        <p className="mt-4 text-[17px] leading-relaxed text-ink-2">
          Signals are collected from official public APIs — GitHub, Hacker News, arXiv, Hugging Face and npm — and recomputed every hour.
          An optional AI layer drafts context, but a statement is kept as fact only when its quoted excerpt is found verbatim in the cited
          source. If every live source is unavailable, the site falls back to a clearly labelled fictional demo dataset. The bar at the top
          of every page says which you are looking at. See the{' '}
          <Link href="/methodology" className="link">
            methodology
          </Link>{' '}
          for exactly how it is processed and scored.
        </p>
      </article>
    </div>
  )
}
