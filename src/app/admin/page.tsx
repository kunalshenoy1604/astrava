import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/viewer'
import { adminListSignals, adminPipelineRuns } from '@/lib/admin/queries'
import { STATUS_LABEL } from '@/lib/domain/labels'
import { formatDateTime, topicName } from '@/lib/format'
import { LoadingState } from '@/components/States'

export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } }

async function AdminHome() {
  // Non-admins get a 404, not a hint that this page exists.
  if (!(await requireAdmin())) notFound()
  const [signals, runs] = await Promise.all([adminListSignals(), adminPipelineRuns()])
  return (
    <>
      <section aria-labelledby="signals-h">
        <h2 id="signals-h" className="meta mb-3 text-ink">
          Signals ({signals.length})
        </h2>
        <div className="scroll-x">
          <table className="w-full min-w-[56rem] text-sm">
            <thead>
              <tr className="meta text-left">
                <th scope="col" className="pb-2 font-normal">Signal</th>
                <th scope="col" className="pb-2 font-normal">Topic</th>
                <th scope="col" className="pb-2 font-normal">Status</th>
                <th scope="col" className="pb-2 text-right font-normal">Score</th>
                <th scope="col" className="pb-2 text-right font-normal">Sources</th>
                <th scope="col" className="pb-2 font-normal">Flags</th>
                <th scope="col" className="pb-2 font-normal">Updated</th>
              </tr>
            </thead>
            <tbody>
              {signals.map((s) => (
                <tr key={s.id} className={`rule-top ${s.is_hidden ? 'text-ink-3' : ''}`}>
                  <td className="max-w-md py-2 pr-4">
                    <Link href={`/admin/signals/${s.id}`} className="font-medium hover:text-accent">
                      {s.title}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">{topicName(s.primary_topic)}</td>
                  <td className="py-2 pr-4">{STATUS_LABEL[s.status]}</td>
                  <td className="numeric py-2 pr-4 text-right">{s.score_total}</td>
                  <td className="numeric py-2 pr-4 text-right">{s.source_count}</td>
                  <td className="meta py-2 pr-4 text-[10px]">
                    {[s.is_verified && 'verified', s.is_hidden && 'hidden', s.is_demo && 'demo'].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td className="py-2 text-xs text-ink-3">{formatDateTime(s.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section aria-labelledby="runs-h" className="mt-12">
        <h2 id="runs-h" className="meta mb-3 text-ink">
          Recent pipeline runs
        </h2>
        {runs.length === 0 ? (
          <p className="text-sm text-ink-2">No runs yet. Trigger /api/cron/ingest with the cron secret, or run `npm run pipeline`.</p>
        ) : (
          <ul className="divide-y divide-rule border-y border-rule text-sm">
            {runs.map((r) => (
              <li key={r.id} className="grid gap-1 py-2 sm:grid-cols-[12rem_6rem_1fr]">
                <span className="text-ink-2">{formatDateTime(r.started_at)}</span>
                <span className={`meta ${r.status === 'failed' ? 'text-negative' : r.status === 'partial' ? 'text-caution' : 'text-positive'}`}>{r.status}</span>
                <code className="truncate font-mono text-xs text-ink-3">{r.error ?? JSON.stringify(r.stats)}</code>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-page px-4 pt-10 sm:px-6">
      <p className="meta">Restricted</p>
      <h1 className="mt-1 mb-4 font-serif text-4xl font-medium">Data management</h1>
      <p className="mb-8 flex gap-4 text-sm">
        <Link href="/admin/applications" className="link">
          Reviewer applications
        </Link>
        <Link href="/moderation" className="link">
          Moderation log
        </Link>
      </p>
      <Suspense fallback={<LoadingState rows={4} label="Loading admin" />}>
        <AdminHome />
      </Suspense>
    </div>
  )
}
