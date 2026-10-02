import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import {
  ADOPTION_GROWTH_SATURATION,
  ADOPTION_RATE_SATURATION,
  BAND_THRESHOLDS,
  CONFIDENCE_INDEPENDENT_SATURATION,
  CONFIDENCE_WEIGHTS,
  CONFIRMATION_SATURATION,
  FACTOR_LABELS,
  FACTOR_WEIGHTS,
  INTEGRATION_SATURATION,
  MOMENTUM_BASELINE_PERIODS,
  MOMENTUM_MIN_VOLUME,
  MOMENTUM_SATURATION,
  RUBRIC_LABELS,
  SCORE_MODEL_VERSION,
  TIER_WEIGHT,
  TIME_TO_IMPACT_POINTS,
} from '@/lib/scoring/model'
import { HYPE_LEXICON, HYPE_PENALTY_CAP, HYPE_RULES } from '@/lib/scoring/hype'
import { CANDIDATE_RULES, WINDOW_COUNT, WINDOW_DAYS } from '@/lib/pipeline/stages'
import { ALL_ADAPTERS } from '@/lib/pipeline/sources'
import { CLAIM_DESCRIPTION, TIME_TO_IMPACT_LABEL } from '@/lib/domain/labels'
import type { FactorId, RubricLevel, TimeToImpact } from '@/lib/domain/types'
import { absoluteUrl } from '@/lib/config'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { JsonLd } from '@/components/JsonLd'
import { ClaimTag } from '@/components/ClaimTag'

export const metadata: Metadata = {
  title: 'Methodology',
  description:
    'How Astrava discovers signals, removes duplicates, measures momentum, weights evidence, penalises hype and represents uncertainty — with the exact weights and thresholds used by the Breakout Score.',
  alternates: { canonical: '/methodology' },
}

const SECTIONS = [
  ['discovery', 'How signals are discovered'],
  ['pipeline', 'The pipeline'],
  ['deduplication', 'How duplicates are removed'],
  ['momentum', 'How momentum is calculated'],
  ['breakout-score', 'How the Breakout Score works'],
  ['evidence', 'How evidence is weighted'],
  ['hype', 'How hype is penalised'],
  ['ai-layer', 'The AI contextual layer'],
  ['moderation', 'Human review and moderation'],
  ['uncertainty', 'How uncertainty is represented'],
  ['limitations', 'Known limitations'],
] as const

function H2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="mt-16 scroll-mt-20 border-t border-rule-strong pt-6 font-serif text-3xl font-medium tracking-[-0.015em]">
      {children}
    </h2>
  )
}

const P = ({ children }: { children: ReactNode }) => <p className="mt-4 text-[17px] leading-relaxed text-ink-2">{children}</p>
const Code = ({ children }: { children: ReactNode }) => (
  <pre className="scroll-x mt-4 rounded-sm border border-rule bg-paper-raised p-4 font-mono text-[13px] leading-relaxed text-ink">{children}</pre>
)

const FACTOR_RULE: Record<FactorId, string> = {
  novelty: 'Analyst rubric 0–4 (None → Exceptional). Points = level ÷ 4 × 15.',
  technicalSignificance: 'Analyst rubric 0–4. How much the change alters what is technically possible or affordable.',
  developerRelevance: 'Analyst rubric 0–4. How directly developers can use or are affected by it.',
  adoptionVelocity: `Half from independent integrations (full at ${INTEGRATION_SATURATION}), half from growth of an adoption series (full at ${ADOPTION_GROWTH_SATURATION}× the starting value, log-scaled) — or, for artifacts created in the last 90 days with no series yet, from their average attention per day since creation (full at ${ADOPTION_RATE_SATURATION}/day, log-scaled).`,
  communityMomentum: `log₂(momentum ratio) ÷ log₂(${MOMENTUM_SATURATION}) × 10, dampened when the latest period has fewer than ${MOMENTUM_MIN_VOLUME} events.`,
  sourceCredibility: `10 × (0.6 × primary source present + 0.4 × mean tier weight).`,
  crossSourceConfirmation: `Independent publishers (community publishers count ½), full at ${CONFIRMATION_SATURATION}.`,
  evidenceStrength: '2.5 points each: primary source, runnable artifact, reproducible or independent benchmark, documentation or paper.',
  timeToImpact: `Estimate band → points: ${(Object.entries(TIME_TO_IMPACT_POINTS) as [TimeToImpact, number][]).map(([k, v]) => `${TIME_TO_IMPACT_LABEL[k]} ${v}`).join(', ')}.`,
}

const PIPELINE = ['Source', 'Normalized event', 'Entity resolution', 'Deduplication', 'Signal extraction', 'Scoring', 'Storage', 'Presentation']

export default function MethodologyPage() {
  return (
    <div className="mx-auto max-w-page px-4 pt-8 sm:px-6">
      <Breadcrumbs items={[{ name: 'Home', href: '/' }, { name: 'Methodology', href: '/methodology' }]} />
      <div className="mt-6 grid gap-12 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav aria-label="Sections" className="hidden lg:block">
          <ol className="sticky top-20 grid gap-1.5 border-l border-rule pl-4 text-sm">
            {SECTIONS.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="text-ink-2 hover:text-accent">
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <article className="min-w-0 max-w-3xl">
          <header className="mb-12">
            <p className="meta">Model {SCORE_MODEL_VERSION}</p>
            <h1 className="mt-2 font-serif text-4xl font-medium tracking-[-0.02em] sm:text-6xl">Methodology</h1>
            <p className="mt-5 text-xl leading-relaxed text-ink-2">
              Astrava ranks technical developments by observable evidence. This page lists every rule the ranking uses, with the
              numbers imported directly from the scoring code, so you can check the work rather than trust it.
            </p>
            <p className="mt-4 border-l-2 border-accent pl-4 text-ink">
              Early signals are not guaranteed outcomes. A high Breakout Score means strong, well-evidenced early momentum — not
              that something will succeed.
            </p>
          </header>

          <H2 id="discovery">How signals are discovered</H2>
          <P>
            An hourly pipeline collects new items from public sources through their official APIs or published feeds. It does not
            scrape pages against their terms. Each source is an adapter that can be added or removed without changing the rest of the
            system.
          </P>
          <div className="scroll-x mt-6">
            <table className="w-full min-w-[32rem] text-sm">
              <caption className="sr-only">Sources and access method</caption>
              <thead>
                <tr className="meta text-left">
                  <th scope="col" className="pb-2 font-normal">Source</th>
                  <th scope="col" className="pb-2 font-normal">Access</th>
                </tr>
              </thead>
              <tbody>
                {ALL_ADAPTERS.map((a) => (
                  <tr key={a.id} className="rule-top">
                    <th scope="row" className="py-2.5 pr-4 text-left font-medium">{a.name}</th>
                    <td className="py-2.5 text-ink-2">{a.access}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <P>
            A cluster of events becomes a candidate signal when it appears in at least {CANDIDATE_RULES.minDistinctSources} distinct
            sources, or a measured series reaches {CANDIDATE_RULES.minMomentumRatio}× its baseline with at least{' '}
            {CANDIDATE_RULES.minLatestVolume} events in the latest window, or a repository gains {CANDIDATE_RULES.minStarsGained}+ stars
            in a window, or discussion reaches {CANDIDATE_RULES.minDiscussionPoints}+ points. Everything else is stored as raw events and
            re-evaluated on later runs.
          </P>

          <H2 id="pipeline">The pipeline</H2>
          <div className="scroll-x mt-6 pb-2">
            <ol className="flex min-w-max items-center gap-2">
              {PIPELINE.map((step, i) => (
                <li key={step} className="flex items-center gap-2">
                  <span className={`rounded-xs border px-3 py-2 text-sm ${step === 'Scoring' ? 'border-accent bg-accent-soft' : 'border-rule-strong bg-paper-raised'}`}>
                    <span className="numeric mr-2 text-xs text-ink-3">{String(i + 1).padStart(2, '0')}</span>
                    {step}
                  </span>
                  {i < PIPELINE.length - 1 ? <span aria-hidden className="text-ink-3">→</span> : null}
                </li>
              ))}
            </ol>
          </div>
          <P>
            The frontend never polls sources. It reads stored results, which are cached and invalidated when a pipeline run writes new
            data. Each run is recorded with per-source counts and errors; one failing source never blocks the others.
          </P>

          <H2 id="deduplication">How duplicates are removed</H2>
          <P>
            Every normalised event carries a deduplication key (source plus the source’s own identifier, plus the day for snapshot
            sources). Keys already stored are skipped. Within a batch, events that share a canonical URL are collapsed: tracking
            parameters, fragments, <code className="font-mono text-sm">www.</code> and arXiv version suffixes are stripped first.
          </P>
          <P>
            Entity resolution then joins events that refer to the same thing. A Hacker News thread linking to a GitHub repository, an
            npm package whose repository field points to it, and an arXiv abstract that mentions its code URL resolve to one entity
            through shared references (union-find over <code className="font-mono text-sm">github:</code>,{' '}
            <code className="font-mono text-sm">npm:</code>, <code className="font-mono text-sm">hf:</code> and{' '}
            <code className="font-mono text-sm">arxiv:</code> identifiers).
          </P>

          <H2 id="momentum">How momentum is calculated</H2>
          <P>
            Momentum compares a signal with its own recent past, not with other signals. Activity is grouped into rolling{' '}
            {WINDOW_DAYS}-day windows (up to {WINDOW_COUNT}). Cumulative counts such as total stars are differenced into gains per window;
            a window with no earlier observation is left out rather than estimated.
          </P>
          <Code>
            {`momentum ratio = latest window ÷ mean(previous ${MOMENTUM_BASELINE_PERIODS} windows)

points = min(1, log₂(max(ratio, 1)) ÷ log₂(${MOMENTUM_SATURATION})) × 10
       × min(1, latest window ÷ ${MOMENTUM_MIN_VOLUME})      ← low-volume dampening`}
          </Code>
          <P>
            With fewer than three windows, or a baseline of zero, momentum is reported as <em>Insufficient evidence</em> and scores zero.
          </P>

          <H2 id="breakout-score">How the Breakout Score works</H2>
          <P>
            Nine factors sum to 100, then the hype penalty is subtracted and the result is clamped to 0–100. Bands: breakout candidate ≥{' '}
            {BAND_THRESHOLDS.breakout}, strong ≥ {BAND_THRESHOLDS.strong}, worth watching ≥ {BAND_THRESHOLDS.watching}.
          </P>
          <div className="scroll-x mt-6">
            <table className="w-full min-w-[36rem] text-sm">
              <caption className="sr-only">Breakout Score factors</caption>
              <thead>
                <tr className="meta text-left">
                  <th scope="col" className="pb-2 font-normal">Factor</th>
                  <th scope="col" className="pb-2 font-normal">Max</th>
                  <th scope="col" className="pb-2 font-normal">Rule</th>
                </tr>
              </thead>
              <tbody>
                {(Object.entries(FACTOR_WEIGHTS) as [FactorId, number][]).map(([id, w]) => (
                  <tr key={id} className="rule-top align-top">
                    <th scope="row" className="py-2.5 pr-4 text-left font-medium whitespace-nowrap">{FACTOR_LABELS[id]}</th>
                    <td className="numeric py-2.5 pr-4">{w}</td>
                    <td className="py-2.5 text-ink-2">{FACTOR_RULE[id]}</td>
                  </tr>
                ))}
                <tr className="rule-top align-top">
                  <th scope="row" className="py-2.5 pr-4 text-left font-medium">Hype penalty</th>
                  <td className="numeric py-2.5 pr-4 text-negative">−{HYPE_PENALTY_CAP}</td>
                  <td className="py-2.5 text-ink-2">See below.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <P>
            Analyst rubric levels: {(Object.entries(RUBRIC_LABELS) as [string, string][]).map(([k, v]) => `${k} ${v}`).join(' · ')}.
            Automatically detected signals receive conservative heuristic levels that are labelled as such, and technical significance
            is left unassessed until a person reviews it — so unreviewed signals rank lower by design.
          </P>
          <P>
            The score is not asked of a language model. It is a deterministic function of stored inputs, so the same inputs always give
            the same number, and every signal page shows the full breakdown.
          </P>

          <H2 id="evidence">How evidence is weighted</H2>
          <P>Each source is classified by tier and by whether its publisher is independent of the project.</P>
          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            {(Object.entries(TIER_WEIGHT) as [string, number][]).map(([tier, w]) => (
              <div key={tier} className="border-t border-rule pt-2">
                <dt className="meta text-ink">{tier}</dt>
                <dd className="numeric mt-1 text-2xl">{w.toFixed(2)}</dd>
              </div>
            ))}
          </dl>
          <P>
            Primary sources (release notes, repositories, papers) say what changed. Secondary sources (independent reporting,
            third-party benchmarks, integrations by other projects) confirm it. Community sources show attention, not correctness, so
            they count half towards cross-source confirmation. Placeholder URLs exist only in the labelled demo dataset, and are never emitted as citations in structured data.
          </P>

          <H2 id="hype">How hype is penalised</H2>
          <ul className="mt-4 grid gap-3 text-[17px] leading-relaxed text-ink-2">
            <li>
              <strong className="text-ink">Marketing language:</strong> −{HYPE_RULES.hypeLanguage.perHit} per superlative in source
              headlines, up to −{HYPE_RULES.hypeLanguage.max}. Terms: {HYPE_LEXICON.map((t) => `“${t}”`).join(', ')}.
            </li>
            <li>
              <strong className="text-ink">Self-reported benchmarks only:</strong> −{HYPE_RULES.vendorOnlyBenchmark.points} when benchmarks
              exist but none is independent.
            </li>
            <li>
              <strong className="text-ink">Attention outpacing evidence:</strong> −{HYPE_RULES.attentionOutpacingEvidence.points} when
              community sources are at least {HYPE_RULES.attentionOutpacingEvidence.ratio}× the substantive ones and evidence strength is
              below {HYPE_RULES.attentionOutpacingEvidence.evidenceBelow}/10.
            </li>
            <li>
              <strong className="text-ink">Analyst flags:</strong> −1 to −3 each, always with a written reason shown in the breakdown.
            </li>
          </ul>
          <P>The total penalty is capped at −{HYPE_PENALTY_CAP}. A hype penalty also lowers confidence.</P>

          <H2 id="ai-layer">The AI contextual layer</H2>
          <P>
            When an AI key is configured, the highest-ranked new signals are read by a language model (by default{' '}
            <code className="font-mono text-sm">openai/gpt-oss-20b</code> on Groq; any OpenAI-compatible endpoint works). The model sees only
            text from the signal’s own sources — the repository README, model card, package readme or paper abstract — and returns
            structured JSON: whether the item is relevant to developers, a plain title and summary, claims, limitations, maturity and rubric
            suggestions.
          </P>
          <ul className="mt-4 grid list-disc gap-2 pl-5 text-[17px] leading-relaxed text-ink-2">
            <li>Every claim must carry a quote. Code checks that the quote appears verbatim in the cited source; claims that fail are discarded, not softened.</li>
            <li>Kept claims are shown as facts with their quote and an <span className="font-mono text-sm">AI</span> marker; judgements (who is affected, what to do) are shown as analysis.</li>
            <li>Rubric suggestions apply only with a verified quote, are capped at “high”, and never override a human reviewer.</li>
            <li>Items the model classifies as spam, off-topic or not useful to developers are removed from the feed.</li>
            <li>The model is never asked for the Breakout Score. The score remains a deterministic function of the stored inputs.</li>
            <li>Results are cached per signal for a week, and a per-run call budget keeps usage within free-tier limits.</li>
          </ul>

          <H2 id="moderation">Human review and moderation</H2>
          <P>
            Approved reviewers can hide a signal from public view, and restore it, with a written reason. Reasons and reviewer names are
            published in the <Link href="/moderation" className="link">moderation log</Link>. Reviewer access is granted by application: a
            structured case, including a sample review of a live signal, read and approved by the site owner.{' '}
            <Link href="/reviewers" className="link">About the reviewer programme</Link>.
          </P>

          <H2 id="uncertainty">How uncertainty is represented</H2>
          <P>Every statement on a signal page carries one of three labels:</P>
          <dl className="mt-4 grid gap-3">
            {(['fact', 'analysis', 'estimate'] as const).map((k) => (
              <div key={k} className="flex items-baseline gap-3">
                <dt>
                  <ClaimTag kind={k} />
                </dt>
                <dd className="text-ink-2">{CLAIM_DESCRIPTION[k]}</dd>
              </div>
            ))}
          </dl>
          <P>
            A statement cannot be stored as a fact without a source; the data layer rejects it. Where information is missing — no
            benchmark, no maintainer count, no architecture — the page says <em>Insufficient evidence</em> instead of filling the gap.
          </P>
          <Code>
            {`confidence = ${CONFIDENCE_WEIGHTS.coverage} × share of measured factors with data
           + ${CONFIDENCE_WEIGHTS.independent} × min(independent non-community publishers, ${CONFIDENCE_INDEPENDENT_SATURATION}) ÷ ${CONFIDENCE_INDEPENDENT_SATURATION}
           + ${CONFIDENCE_WEIGHTS.primary} × primary source present
           + ${CONFIDENCE_WEIGHTS.evidence} × evidence strength ÷ 10
           − ${CONFIDENCE_WEIGHTS.hype} × |hype penalty| ÷ ${HYPE_PENALTY_CAP}

high ≥ 0.75 · medium ≥ 0.50 · otherwise low
capped at low when no independent, non-community source exists`}
          </Code>
          <P>
            Implementation difficulty and time to impact are estimates for a typical application team. They are labelled as estimates
            wherever they appear.
          </P>

          <H2 id="limitations">Known limitations</H2>
          <ul className="mt-4 grid list-disc gap-2 pl-5 text-[17px] leading-relaxed text-ink-2">
            <li>Coverage is limited to sources with public APIs or feeds; work discussed only in private channels is invisible.</li>
            <li>Stars, downloads and points can be gamed. Momentum dampening and the adoption factor’s reliance on integrations reduce, but do not remove, this risk.</li>
            <li>Three factors are human judgements. They are labelled, and their rationale is shown, but they are still judgements.</li>
            <li>A new project has no history, so its momentum is “insufficient evidence” for its first weeks.</li>
            <li>Rankings compare signals with each other; they say nothing about absolute quality.</li>
          </ul>
          <p className="mt-10 text-sm text-ink-3">
            Questions about a specific score? Every signal page links each point to its inputs. See also{' '}
            <Link href="/about" className="link">
              About Astrava
            </Link>
            .
          </p>
        </article>
      </div>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'TechArticle',
          headline: 'Astrava methodology',
          description: metadata.description,
          url: absoluteUrl('/methodology'),
          author: { '@type': 'Organization', name: 'Astrava' },
          about: ['Technology trend detection', 'Evidence weighting', 'Ranking methodology'],
        }}
      />
    </div>
  )
}
