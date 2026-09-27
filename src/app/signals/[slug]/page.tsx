import type { Metadata } from 'next'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAllSlugs, getSignalBySlug, settle } from '@/lib/data/queries'
import type { BreakoutScore, Signal } from '@/lib/domain/types'
import { CONFIDENCE_LABEL, TIME_TO_IMPACT_LABEL } from '@/lib/domain/labels'
import { absoluteUrl, siteConfig } from '@/lib/config'
import { formatDate, formatRatio, topicName } from '@/lib/format'
import { developerImpact } from '@/lib/scoring/model'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { JsonLd } from '@/components/JsonLd'
import { ScoreBlock, ScoreTicks } from '@/components/SignalScore'
import { ScoreBreakdown, WhyScore } from '@/components/ScoreBreakdown'
import { StatementList } from '@/components/StatementList'
import { ClaimTag } from '@/components/ClaimTag'
import { ArchitectureDiagram } from '@/components/ArchitectureDiagram'
import { TechnicalDifficulty } from '@/components/TechnicalDifficulty'
import { MomentumChart } from '@/components/MomentumChart'
import { SignalTimeline } from '@/components/SignalTimeline'
import { EvidenceList } from '@/components/EvidenceList'
import { RelatedSignals } from '@/components/RelatedSignals'
import { SaveSignalButton } from '@/components/SaveSignalButton'
import { DemoBadge, MetaSep, StatusBadge, TopicBadge, VerifiedBadge } from '@/components/Badges'
import { ErrorState, LoadingState } from '@/components/States'
import { AdoptionTable, Builders, Competing, Section, ShouldICare, TOC } from './sections'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const slugs = await getAllSlugs()
  return slugs.map((s) => ({ slug: s.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const res = await settle(getSignalBySlug(slug))
  const hit = res.ok ? res.value : null
  if (!hit) return { title: 'Signal not found', robots: { index: false } }
  const { signal, score } = hit
  const description = `${signal.dek} Breakout Score ${score.total}/100 (${CONFIDENCE_LABEL[score.confidence.level].toLowerCase()}).`
  const url = `/signals/${signal.slug}`
  return {
    title: signal.title,
    description,
    alternates: { canonical: url },
    openGraph: { type: 'article', url, title: signal.title, description, publishedTime: signal.firstSeenAt, modifiedTime: signal.updatedAt },
    twitter: { card: 'summary_large_image', title: signal.title, description },
    // Demo content is fictional: keep it out of search indexes.
    ...(signal.isDemo ? { robots: { index: false, follow: true } } : {}),
  }
}

function KeyFacts({ signal, score }: { signal: Signal; score: BreakoutScore }) {
  const facts: [string, string, string?][] = [
    ['Time to impact', TIME_TO_IMPACT_LABEL[signal.timeToImpact], 'Estimate'],
    ['Momentum', score.momentumRatio === null ? 'Insufficient evidence' : `${formatRatio(score.momentumRatio)} baseline`, 'Measured'],
    ['Evidence', `${signal.sources.length} sources`, 'Measured'],
    ['Confidence', CONFIDENCE_LABEL[score.confidence.level].replace(' confidence', ''), 'Measured'],
    ['Developer impact', { high: 'High', medium: 'Medium', low: 'Low', unknown: 'Not assessed' }[developerImpact(signal)], 'Analysis'],
    ['First seen', formatDate(signal.firstSeenAt)],
  ]
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
      {facts.map(([k, v, basis]) => (
        <div key={k} className="border-t border-rule pt-2">
          <dt className="meta text-[10px]">{k}</dt>
          <dd className="numeric mt-1 text-sm">{v}</dd>
          {basis ? <dd className="mt-0.5 text-[11px] text-ink-3">{basis}</dd> : null}
        </div>
      ))}
    </dl>
  )
}

function articleJsonLd(signal: Signal, score: BreakoutScore) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: signal.title,
    description: signal.dek,
    datePublished: signal.firstSeenAt,
    dateModified: signal.updatedAt,
    mainEntityOfPage: absoluteUrl(`/signals/${signal.slug}`),
    author: { '@type': 'Organization', name: siteConfig.name, url: siteConfig.url },
    publisher: { '@type': 'Organization', name: siteConfig.name, url: siteConfig.url },
    articleSection: topicName(signal.primaryTopic),
    keywords: signal.topics.map(topicName).join(', '),
    about: signal.entities.map((e) => ({ '@type': 'Thing', name: e.name })),
    // Only real, non-placeholder URLs are cited.
    citation: signal.sources.filter((s) => !s.isPlaceholder).map((s) => ({ '@type': 'CreativeWork', name: s.title, url: s.url })),
    isAccessibleForFree: true,
    additionalProperty: [{ '@type': 'PropertyValue', name: 'Breakout Score', value: score.total, maxValue: 100 }],
  }
}

async function SignalArticle({ params }: Props) {
  const { slug } = await params
  const res = await settle(getSignalBySlug(slug))
  if (!res.ok) return <ErrorState title="This signal could not load." retryHref={`/signals/${slug}`} />
  if (!res.value) notFound()
  const { signal, score } = res.value

  return (
    <article className="mx-auto max-w-page px-4 pt-8 sm:px-6">
      <Breadcrumbs
        items={[
          { name: 'Home', href: '/' },
          { name: 'Signals', href: '/signals' },
          { name: topicName(signal.primaryTopic), href: `/topics/${signal.primaryTopic}` },
          { name: signal.title, href: `/signals/${signal.slug}` },
        ]}
      />

      <header className="mt-8 grid gap-10 border-b border-rule-strong pb-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <TopicBadge slug={signal.primaryTopic} />
            <MetaSep />
            <StatusBadge status={signal.status} />
            <MetaSep />
            <span className="meta">
              Updated <time dateTime={signal.updatedAt}>{formatDate(signal.updatedAt)}</time>
            </span>
            {signal.verified ? <VerifiedBadge /> : <span className="meta text-ink-3">Not yet reviewed</span>}
            {signal.isDemo ? <DemoBadge /> : null}
          </p>
          <h1 className="mt-4 font-serif text-3xl leading-[1.08] font-medium tracking-[-0.02em] text-balance sm:text-4xl lg:text-[3.25rem]">
            {signal.title}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-2">{signal.dek}</p>
          {/* Compact score for small screens, so it is visible without scrolling past the header */}
          <a href="#score" className="mt-5 flex items-center gap-4 rounded-sm border border-rule-strong px-3 py-2 lg:hidden">
            <span className="meta text-[10px]">Breakout</span>
            <span className="numeric text-3xl leading-none font-medium">{score.total}</span>
            <ScoreTicks score={score.total} />
            <span className="meta ml-auto text-[10px] text-ink-2">{CONFIDENCE_LABEL[score.confidence.level]} ↓</span>
          </a>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <SaveSignalButton slug={signal.slug} title={signal.title} />
            <span className="meta text-ink-3">Also in: {signal.topics.filter((t) => t !== signal.primaryTopic).map(topicName).join(' · ') || '—'}</span>
          </div>
          {signal.isDemo ? (
            <p className="mt-6 max-w-2xl border-l-2 border-dashed border-caution pl-3 text-sm text-ink-2">
              This is a fictional signal from the demo dataset. Projects, publishers and numbers are invented to show how the product
              works; its sources link to placeholder pages.
            </p>
          ) : null}
        </div>
        <aside aria-label="Breakout Score" className="grid content-start gap-6">
          <div className="flex items-end justify-between gap-4">
            <ScoreBlock score={score.total} size="lg" />
            <div className="text-right text-sm">
              <p className="font-medium">{CONFIDENCE_LABEL[score.confidence.level]}</p>
              <p className="meta mt-1">{score.modelVersion}</p>
            </div>
          </div>
          <WhyScore score={score} />
          <KeyFacts signal={signal} score={score} />
        </aside>
      </header>

      <div className="grid gap-12 pt-10 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <nav aria-label="On this page" className="hidden lg:block">
          <ol className="sticky top-20 grid gap-1.5 border-l border-rule pl-4 text-sm">
            {TOC.map((t) => (
              <li key={t.id}>
                <a href={`#${t.id}`} className="text-ink-2 hover:text-accent">
                  {t.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="min-w-0 max-w-3xl">
          <p className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-3">
            <span className="meta mr-1 text-ink-2">Reading guide</span>
            <ClaimTag kind="fact" /> cited ·
            <ClaimTag kind="analysis" /> our interpretation ·
            <ClaimTag kind="estimate" /> forward-looking · [n] links to the source
          </p>

          <Section id="what-happened" title="What happened">
            <StatementList statements={signal.whatHappened} className="text-[17px]" />
          </Section>

          <Section id="why-it-matters" title="Why it matters">
            <StatementList statements={signal.whyItMatters} className="text-[17px]" />
          </Section>

          <Section id="should-i-care" title="Should I care?" kicker="For developers">
            <ShouldICare signal={signal} />
          </Section>

          <Section id="technical-change" title="Technical change">
            <StatementList statements={signal.technicalChange} emptyHint="The technical change has not been documented yet." />
            <h3 id="architecture" className="meta mt-10 mb-3 scroll-mt-20 text-ink">
              Architecture
            </h3>
            <ArchitectureDiagram architecture={signal.architecture} />
          </Section>

          <Section id="developer-impact" title="Developer impact">
            <StatementList statements={signal.developerImplications} emptyHint="Developer implications have not been assessed yet." />
            <div className="mt-8">
              <TechnicalDifficulty difficulty={signal.difficulty} />
            </div>
          </Section>

          <Section id="adoption" title="Adoption & momentum">
            <AdoptionTable signal={signal} />
            {signal.series.length ? (
              <div className="mt-10 grid gap-10">
                {signal.series.map((s) => (
                  <MomentumChart key={s.id} series={s} isMomentumSeries={s.id === signal.scoreInputs.momentumSeriesId} />
                ))}
              </div>
            ) : null}
            <h3 className="meta mt-10 mb-4 text-ink">Timeline</h3>
            <SignalTimeline events={signal.events} />
          </Section>

          <Section id="limitations" title="Limitations & risks">
            <StatementList statements={signal.risks} emptyHint="No risks documented yet — which is not the same as no risks." />
          </Section>

          <Section id="competing" title="Competing approaches">
            <Competing signal={signal} />
          </Section>

          <Section id="builders" title="Who is building on it">
            <Builders signal={signal} />
          </Section>

          <Section id="evidence" title="Evidence & sources" kicker={`${signal.sources.length} sources`}>
            <EvidenceList sources={signal.sources} />
          </Section>

          <Section id="score" title={`How the score of ${score.total} was calculated`}>
            <div className="mb-4 flex items-center gap-3">
              <ScoreTicks score={score.total} />
              <span className="numeric text-sm">{score.total}/100</span>
            </div>
            <ScoreBreakdown score={score} />
          </Section>

          <Section id="related" title="Related signals">
            <Suspense fallback={<LoadingState rows={2} label="Loading related signals" />}>
              <RelatedSignals slug={signal.slug} topics={signal.topics} />
            </Suspense>
          </Section>

          <p className="meta mt-4 normal-case tracking-normal">
            <Link href={`/topics/${signal.primaryTopic}`} className="link">
              More in {topicName(signal.primaryTopic)}
            </Link>
          </p>
        </div>
      </div>
      <JsonLd data={articleJsonLd(signal, score)} />
    </article>
  )
}

export default function SignalPage(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-page px-4 pt-10 sm:px-6">
          <LoadingState rows={3} label="Loading signal" />
        </div>
      }
    >
      <SignalArticle params={props.params} />
    </Suspense>
  )
}
