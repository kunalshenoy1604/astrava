import Link from 'next/link'
import { getDatasetStatus, settle } from '@/lib/data/queries'
import { formatDate } from '@/lib/format'
import { SCORE_MODEL_VERSION } from '@/lib/scoring/model'
import { RelativeTime } from './RelativeTime'

const SOURCE_NAMES: Record<string, string> = {
  github: 'GitHub',
  arxiv: 'arXiv',
  hackernews: 'Hacker News',
  huggingface: 'Hugging Face',
  npm: 'npm',
  rss: 'official feeds',
}

/** Thin status tape above the header: says plainly whether data is demo or live, and how fresh it is. */
export async function DatasetBar() {
  const status = await settle(getDatasetStatus())
  if (!status.ok) {
    return (
      <div className="border-b border-rule bg-paper-sunken">
        <p className="meta mx-auto max-w-page px-4 py-1.5 text-negative sm:px-6">Data service unavailable · showing nothing rather than guessing</p>
      </div>
    )
  }
  const s = status.value
  return (
    <div className="border-b border-rule bg-paper-sunken">
      <p className="meta mx-auto flex max-w-page flex-wrap items-center gap-x-3 gap-y-0.5 px-4 py-1.5 sm:px-6">
        {s.mode === 'demo' ? (
          <>
            <span className="inline-flex items-center gap-1.5 text-caution">
              <span aria-hidden className="size-1.5 rounded-full border border-caution" />
              Demo dataset
            </span>
            <span className="hidden sm:inline">{s.note ?? 'Fictional signals · placeholder sources · illustrative numbers'}</span>
            <span>Snapshot {s.lastUpdated ? formatDate(s.lastUpdated) : '—'}</span>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-1.5 text-positive">
              <span aria-hidden className="size-1.5 rounded-full bg-positive animate-pulse-signal" />
              Live
            </span>
            <span>{s.signalCount} signals</span>
            {s.mode === 'live' ? (
              <span className="hidden sm:inline">
                From {Object.entries(s.sources ?? {}).filter(([, n]) => n > 0).map(([k]) => SOURCE_NAMES[k] ?? k).join(', ') || 'public APIs'} · refreshed hourly
              </span>
            ) : null}
            {s.lastUpdated ? (
              <span>
                Updated <RelativeTime iso={s.lastUpdated} />
              </span>
            ) : null}
          </>
        )}
        <span className="ml-auto hidden md:inline">
          Score model {SCORE_MODEL_VERSION} ·{' '}
          <Link href="/methodology" className="underline decoration-rule underline-offset-2 hover:text-ink">
            methodology
          </Link>
        </span>
      </p>
    </div>
  )
}
