import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getFeed, settle } from '@/lib/data/queries'
import { TOPICS, TOPIC_BY_SLUG } from '@/lib/demo/topics'
import type { SignalSummary, Topic } from '@/lib/domain/types'
import { absoluteUrl } from '@/lib/config'
import { formatRatio } from '@/lib/format'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { JsonLd } from '@/components/JsonLd'
import { SignalFeed } from '@/components/SignalFeed'
import { ErrorState, LoadingState } from '@/components/States'
import { MethodologyExplainer } from '@/components/MethodologyExplainer'

interface Props {
  params: Promise<{ slug: string }>
}

const CURRENT_LIMIT = 6
const HISTORICAL_AFTER_DAYS = 30

export function generateStaticParams() {
  return TOPICS.map((t) => ({ slug: t.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const topic = TOPIC_BY_SLUG.get(slug)
  if (!topic) return { title: 'Topic not found', robots: { index: false } }
  return {
    title: `${topic.name} signals`,
    description: `Early technical signals in ${topic.name.toLowerCase()}: ${topic.description}`,
    alternates: { canonical: `/topics/${topic.slug}` },
    openGraph: { url: `/topics/${topic.slug}`, title: `${topic.name} signals · Astrava`, description: topic.description },
  }
}

/** Historical = cooling, or first seen more than 30 days before the most recent update in the topic. */
function splitHistorical(list: SignalSummary[]) {
  const latest = Math.max(0, ...list.map((s) => Date.parse(s.updatedAt)))
  const cutoff = latest - HISTORICAL_AFTER_DAYS * 86_400_000
  const historical = list.filter((s) => s.status === 'cooling' || Date.parse(s.firstSeenAt) < cutoff)
  const current = list.filter((s) => !historical.includes(s))
  return { current, historical }
}

async function TopicSignals({ topic }: { topic: Topic }) {
  const res = await settle(getFeed({ topics: [topic.slug] }))
  if (!res.ok) return <ErrorState retryHref={`/topics/${topic.slug}`} />
  const { current, historical } = splitHistorical(res.value)

  return (
    <>
      <section aria-labelledby="current" className="pt-10">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 id="current" className="font-serif text-3xl font-medium">
            Current signals
          </h2>
          <Link href={`/signals?topic=${topic.slug}`} className="meta hover:text-accent">
            Filter all signals →
          </Link>
        </div>
        <SignalFeed
          signals={current.slice(0, CURRENT_LIMIT)}
          ranked
          empty={{
            title: `No current ${topic.name.toLowerCase()} signals.`,
            body: `Try ${topic.related.map((r) => TOPIC_BY_SLUG.get(r)?.name).filter(Boolean).join(' or ')}.`,
            action: { href: `/topics/${topic.related[0]}`, label: `Open ${TOPIC_BY_SLUG.get(topic.related[0]!)?.name}` },
          }}
        />
        {current.length > CURRENT_LIMIT ? (
          <p className="mt-4 text-right">
            <Link href={`/signals?topic=${topic.slug}`} className="btn-secondary">
              {current.length - CURRENT_LIMIT} more
            </Link>
          </p>
        ) : null}
      </section>

      <div className="grid gap-12 pt-16 md:grid-cols-2">
        <section aria-labelledby="emerging">
          <h2 id="emerging" className="font-serif text-2xl font-medium">
            Emerging technologies
          </h2>
          <p className="mt-2 text-sm text-ink-2">Areas we track in {topic.name.toLowerCase()}, and where current signals sit.</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {topic.emerging.map((e) => (
              <li key={e} className="rounded-xs border border-rule px-2 py-1 text-sm">
                {e}
              </li>
            ))}
          </ul>
          <ol className="mt-6 divide-y divide-rule border-y border-rule">
            {current.slice(0, 5).map((s) => (
              <li key={s.slug} className="flex items-baseline justify-between gap-4 py-2 text-sm">
                <Link href={`/signals/${s.slug}`} className="hover:text-accent">
                  {s.title}
                </Link>
                <span className="numeric shrink-0 text-ink-3">{formatRatio(s.momentumRatio)}</span>
              </li>
            ))}
          </ol>
        </section>
        <section aria-labelledby="historical">
          <h2 id="historical" className="font-serif text-2xl font-medium">
            Historical signals
          </h2>
          <p className="mt-2 text-sm text-ink-2">
            Cooling signals, and signals first seen more than {HISTORICAL_AFTER_DAYS} days before the latest update in this topic.
          </p>
          {historical.length === 0 ? (
            <p className="mt-4 border-l-2 border-dashed border-rule pl-3 text-sm text-ink-3">
              None yet. As the dataset ages, older and cooling signals move here so the current list stays current.
            </p>
          ) : (
            <ol className="mt-4 divide-y divide-rule border-y border-rule">
              {historical.map((s) => (
                <li key={s.slug} className="flex items-baseline justify-between gap-4 py-2 text-sm">
                  <Link href={`/signals/${s.slug}`} className="hover:text-accent">
                    {s.title}
                  </Link>
                  <span className="numeric shrink-0">{s.score}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: `${topic.name} signals`,
          description: topic.description,
          url: absoluteUrl(`/topics/${topic.slug}`),
          mainEntity: {
            '@type': 'ItemList',
            itemListElement: current.slice(0, CURRENT_LIMIT).map((s, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              url: absoluteUrl(`/signals/${s.slug}`),
              name: s.title,
            })),
          },
        }}
      />
    </>
  )
}

async function TopicPageContent({ params }: Props) {
  const { slug } = await params
  const topic = TOPIC_BY_SLUG.get(slug)
  if (!topic) notFound()
  const parent = topic.parent ? TOPIC_BY_SLUG.get(topic.parent) : undefined
  return (
    <div className="mx-auto max-w-page px-4 pt-8 sm:px-6">
      <Breadcrumbs
        items={[
          { name: 'Home', href: '/' },
          { name: 'Topics', href: '/topics' },
          ...(parent ? [{ name: parent.name, href: `/topics/${parent.slug}` }] : []),
          { name: topic.name, href: `/topics/${topic.slug}` },
        ]}
      />
      <header className="mt-6 grid gap-6 border-b border-rule-strong pb-8 lg:grid-cols-[2fr_1fr]">
        <div>
          <p className="meta">Topic</p>
          <h1 className="mt-1 font-serif text-4xl font-medium tracking-[-0.02em] sm:text-6xl">{topic.name}</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-2">{topic.description}</p>
        </div>
        <nav aria-label="Related topics" className="self-end">
          <p className="meta mb-2">Related topics</p>
          <ul className="grid gap-1">
            {topic.related.map((r) => (
              <li key={r}>
                <Link href={`/topics/${r}`} className="link">
                  {TOPIC_BY_SLUG.get(r)?.name}
                </Link>
              </li>
            ))}
            {TOPICS.filter((t) => t.parent === topic.slug).map((t) => (
              <li key={t.slug}>
                <Link href={`/topics/${t.slug}`} className="link">
                  {t.name}
                </Link>{' '}
                <span className="meta text-[10px]">sub-topic</span>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <Suspense fallback={<LoadingState rows={4} />}>
        <TopicSignals topic={topic} />
      </Suspense>

      <section aria-labelledby="topic-method" className="pt-16">
        <h2 id="topic-method" className="font-serif text-2xl font-medium">
          How {topic.name.toLowerCase()} signals are evaluated
        </h2>
        <p className="mt-3 max-w-3xl text-ink-2">
          The same Breakout Score applies to every topic, so scores are comparable across areas. What differs is which evidence is
          usually available — the questions below describe how that plays out here.
        </p>
      </section>

      <section aria-labelledby="faq" className="pt-10">
        <h2 id="faq" className="meta mb-4 text-ink">
          Frequently asked questions
        </h2>
        <dl className="grid max-w-3xl gap-6">
          {topic.faqs.map((f) => (
            <div key={f.q} className="border-t border-rule pt-4">
              <dt className="font-serif text-xl">{f.q}</dt>
              <dd className="mt-2 leading-relaxed text-ink-2">{f.a}</dd>
            </div>
          ))}
        </dl>
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: topic.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
          }}
        />
      </section>
      <MethodologyExplainer headingLevel={2} contained={false} />
    </div>
  )
}

export default function TopicPage(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-page px-4 pt-10 sm:px-6">
          <LoadingState rows={4} label="Loading topic" />
        </div>
      }
    >
      <TopicPageContent params={props.params} />
    </Suspense>
  )
}
