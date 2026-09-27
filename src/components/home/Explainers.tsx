import Link from 'next/link'
import { JsonLd } from '../JsonLd'

/**
 * Indexable guidance beneath the feed. Written to be useful on its own; the
 * FAQPage structured data mirrors exactly what is visible here.
 */
export const HOME_GUIDES: { id: string; q: string; a: string[] }[] = [
  {
    id: 'what-is-a-signal',
    q: 'What is an emerging technology signal?',
    a: [
      'A signal is an observable change that a developer could act on: a release, a paper with code, a new integration, an independent benchmark, or a security advisory. It is observable because it leaves evidence in public sources — repositories, package registries, specifications, papers — rather than existing only as an opinion.',
      'A signal is not a trend forecast. It is an early data point with measurable momentum. Most signals do not become mainstream; the value is in noticing the few that do while there is still time to evaluate them calmly.',
    ],
  },
  {
    id: 'how-developers-discover',
    q: 'How do developers discover new technologies?',
    a: [
      'Mostly through feeds that mix primary sources (release notes, repositories, papers) with commentary (newsletters, forums, social posts). The commentary is faster but noisier; the primary sources are slower to read but tell you what actually changed.',
      'A practical routine: follow the changelogs of the tools you depend on, watch which projects your dependencies start integrating, and treat a surge of discussion as a prompt to check the primary source — not as evidence in itself.',
    ],
  },
  {
    id: 'evaluate-ai-tools',
    q: 'How can developers evaluate new AI tools?',
    a: [
      'Start from a runnable artifact. If there is no code, weights, package or API you can call, there is nothing to evaluate yet. Then build a small evaluation set from your own work — 20 to 50 real inputs with known-good outputs — and compare the new tool against what you use today.',
      'Check the failure modes as deliberately as the headline numbers: behaviour on long or unusual inputs, cost per request at your volume, licence terms, and who maintains it. Vendor benchmarks are a starting hypothesis; your own data is the test.',
    ],
  },
  {
    id: 'identify-trends-early',
    q: 'How do you identify technology trends early?',
    a: [
      'Look at rates of change rather than totals. A project gaining stars four times faster than its own recent baseline says more than a large, flat star count. Astrava measures this as momentum: the latest period divided by the trailing four-period mean.',
      'Then look for independent confirmation. Other projects integrating something, or a third party reproducing a benchmark, are harder to manufacture than attention. When discussion volume outruns this kind of evidence, treat it as hype until proven otherwise.',
    ],
  },
  {
    id: 'developer-tool-worth-watching',
    q: 'What makes a developer tool worth watching?',
    a: [
      'It solves a problem many teams share, and other projects are building on it. Signs of durability include more than one active maintainer, documentation that describes limitations as well as features, a versioning policy, and a licence you can live with.',
      'Composability matters too: tools that work with existing protocols and formats spread through integrations, while tools that require replacing your stack spread slowly even when they are better.',
    ],
  },
]

export function Explainers() {
  return (
    <section aria-labelledby="guides-heading" className="mx-auto max-w-page px-4 pt-20 sm:px-6">
      <div className="border-t border-rule-strong pt-6">
        <p className="meta">Field guide</p>
        <h2 id="guides-heading" className="mt-1 font-serif text-3xl font-medium tracking-[-0.015em]">
          Finding technical signals early
        </h2>
      </div>
      <div className="mt-8 grid gap-x-16 gap-y-12 md:grid-cols-2">
        {HOME_GUIDES.map((g, i) => (
          <article key={g.id} id={g.id} className="scroll-mt-20">
            <h3 className="flex gap-3 font-serif text-xl leading-snug font-medium">
              <span className="numeric pt-1 text-sm text-accent">{String(i + 1).padStart(2, '0')}</span>
              {g.q}
            </h3>
            <div className="mt-3 grid gap-3 pl-8 text-[15px] leading-relaxed text-ink-2">
              {g.a.map((p, j) => (
                <p key={j}>{p}</p>
              ))}
            </div>
          </article>
        ))}
        <aside className="self-end border-l-2 border-accent pl-5 text-sm text-ink-2">
          <p>
            These are the same principles the ranking uses. The{' '}
            <Link href="/methodology" className="link text-ink">
              methodology
            </Link>{' '}
            shows the exact weights, thresholds and penalties.
          </p>
        </aside>
      </div>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: HOME_GUIDES.map((g) => ({
            '@type': 'Question',
            name: g.q,
            acceptedAnswer: { '@type': 'Answer', text: g.a.join(' ') },
          })),
        }}
      />
    </section>
  )
}
