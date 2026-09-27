import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/viewer'
import { adminGetSignal } from '@/lib/admin/queries'
import { TOPICS } from '@/lib/demo/topics'
import { formatDateTime } from '@/lib/format'
import { AdminSignalForm } from '@/components/AdminSignalForm'
import { ScoreBreakdown } from '@/components/ScoreBreakdown'
import { EvidenceList } from '@/components/EvidenceList'
import { LoadingState } from '@/components/States'

export const metadata: Metadata = { title: 'Edit signal', robots: { index: false, follow: false } }

async function Editor({ params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) notFound()
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) notFound()
  const hit = await adminGetSignal(id)
  if (!hit) notFound()
  const { signal, score, scoreHistory } = hit
  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_26rem]">
      <div className="min-w-0">
        <p className="meta">
          <Link href="/admin" className="hover:text-accent">← All signals</Link> ·{' '}
          <Link href={`/signals/${signal.slug}`} className="hover:text-accent">View public page</Link>
        </p>
        <h1 className="mt-2 mb-8 font-serif text-3xl font-medium">{signal.title}</h1>
        <AdminSignalForm signal={signal} topics={TOPICS} />
        <h2 className="meta mt-12 mb-4 text-ink">Source evidence</h2>
        <EvidenceList sources={signal.sources} />
      </div>
      <aside className="grid content-start gap-8">
        <section>
          <h2 className="meta mb-3 text-ink">Scoring factors</h2>
          <ScoreBreakdown score={score} />
        </section>
        <section>
          <h2 className="meta mb-3 text-ink">Score history</h2>
          <ol className="divide-y divide-rule text-sm">
            {scoreHistory.map((h) => (
              <li key={h.computed_at} className="flex justify-between py-1.5">
                <span className="text-ink-2">{formatDateTime(h.computed_at)}</span>
                <span className="numeric">{h.total}</span>
              </li>
            ))}
          </ol>
        </section>
        <section>
          <h2 className="meta mb-3 text-ink">Raw scoring inputs</h2>
          <pre className="scroll-x rounded-sm border border-rule bg-paper-raised p-3 font-mono text-[11px] leading-relaxed">
            {JSON.stringify(signal.scoreInputs, null, 2)}
          </pre>
        </section>
      </aside>
    </div>
  )
}

export default function AdminSignalPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="mx-auto max-w-page px-4 pt-10 sm:px-6">
      <Suspense fallback={<LoadingState rows={3} label="Loading signal" />}>
        <Editor params={params} />
      </Suspense>
    </div>
  )
}
