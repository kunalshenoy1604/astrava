import Link from 'next/link'
import { getDatasetStatus, settle } from '@/lib/data/queries'
import { formatDate } from '@/lib/format'
import { SCORE_MODEL_VERSION } from '@/lib/scoring/model'
import { RelativeTime } from './RelativeTime'

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
            <span className="hidden sm:inline">Fictional signals · placeholder sources · illustrative numbers</span>
            <span>Snapshot {s.lastUpdated ? formatDate(s.lastUpdated) : '—'}</span>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-1.5 text-positive">
              <span aria-hidden className="size-1.5 rounded-full bg-positive" />
              Live dataset
            </span>
            <span>{s.signalCount} signals</span>
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
