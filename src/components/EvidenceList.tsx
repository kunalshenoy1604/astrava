import { ArrowUpRight } from 'lucide-react'
import type { Source, SourceTier } from '@/lib/domain/types'
import { SOURCE_TIER_LABEL } from '@/lib/domain/labels'
import { displayHost, safeHref } from '@/lib/security/url'
import { formatDate } from '@/lib/format'
import { SourceKindBadge, SourceTierBadge } from './SourceBadge'
import { InsufficientEvidence } from './StatementList'

const TIERS: SourceTier[] = ['primary', 'secondary', 'community']
const TIER_HELP: Record<SourceTier, string> = {
  primary: 'Published by the people who built it: release notes, repositories, papers, official docs.',
  secondary: 'Independent reporting, third-party benchmarks, integrations by other projects.',
  community: 'Discussion threads and social posts. Evidence of attention, not of correctness.',
}

/** Evidence trail grouped by source tier. Every source is a link with an anchor (#src-sN) that statements cite. */
export function EvidenceList({ sources }: { sources: Source[] }) {
  if (sources.length === 0) return <InsufficientEvidence hint="No sources recorded." />
  const hasPlaceholder = sources.some((s) => s.isPlaceholder)
  return (
    <div className="grid gap-8">
      {hasPlaceholder ? (
        <p className="border-l-2 border-dashed border-caution pl-3 text-sm text-ink-2">
          <span className="meta mr-2 text-caution">Demo placeholders</span>
          These sources belong to the fictional demo dataset. Their links point to example.org, a reserved domain, and do not
          support real-world claims.
        </p>
      ) : null}
      {TIERS.map((tier) => {
        const list = sources.filter((s) => s.tier === tier)
        return (
          <section key={tier} aria-labelledby={`tier-${tier}`}>
            <header className="mb-2 flex flex-wrap items-baseline justify-between gap-2 border-b border-rule pb-2">
              <h3 id={`tier-${tier}`} className="text-sm font-medium">
                {SOURCE_TIER_LABEL[tier]} <span className="numeric text-ink-3">({list.length})</span>
              </h3>
              <p className="text-xs text-ink-3">{TIER_HELP[tier]}</p>
            </header>
            {list.length === 0 ? (
              <p className="py-2 text-sm text-ink-3">None recorded.</p>
            ) : (
              <ol className="divide-y divide-rule">
                {list.map((s) => {
                  const href = safeHref(s.url)
                  return (
                    <li key={s.id} id={`src-${s.id}`} className="grid scroll-mt-24 gap-1 py-3 target:bg-accent-soft sm:grid-cols-[2.5rem_1fr]">
                      <span className="numeric text-xs text-ink-3">[{s.id.replace('s', '')}]</span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <SourceKindBadge kind={s.kind} />
                          <SourceTierBadge tier={s.tier} />
                          {s.independent ? (
                            <span className="meta text-positive">Independent</span>
                          ) : (
                            <span className="meta">Self-published</span>
                          )}
                          {s.isPlaceholder ? <span className="meta text-caution">Placeholder URL</span> : null}
                        </div>
                        {href ? (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            className="group mt-1 inline-flex items-start gap-1 font-medium break-words hover:text-accent"
                          >
                            {s.title}
                            <ArrowUpRight aria-hidden className="mt-0.5 size-3.5 shrink-0 text-ink-3 group-hover:text-accent" />
                            <span className="sr-only">(opens in a new tab)</span>
                          </a>
                        ) : (
                          <p className="mt-1 font-medium">{s.title}</p>
                        )}
                        <p className="meta mt-0.5 normal-case tracking-normal">
                          {s.publisher}
                          {s.publishedAt ? ` · ${formatDate(s.publishedAt)}` : ''}
                          {href ? ` · ${displayHost(href)}` : ''}
                        </p>
                        {s.note ? <p className="mt-1 text-sm text-ink-2">{s.note}</p> : null}
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </section>
        )
      })}
    </div>
  )
}
