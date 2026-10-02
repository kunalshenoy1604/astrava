import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { moderationLog } from '@/lib/reviewers/queries'
import { requireReviewer } from '@/lib/auth/viewer'
import { formatDateTime } from '@/lib/format'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { EmptyState, ErrorState, LoadingState } from '@/components/States'
import { ModerationForm } from '@/components/ModerationForm'

export const metadata: Metadata = {
  title: 'Moderation log',
  description: 'Every signal hidden from or restored to public view on Astrava, with the reviewer’s reason.',
  alternates: { canonical: '/moderation' },
}

async function Log() {
  let data
  try {
    data = await moderationLog()
  } catch {
    return <ErrorState title="The moderation log could not load." />
  }
  if (!data) return <EmptyState title="Moderation is not enabled on this deployment." />
  if (data.entries.length === 0) return <EmptyState title="No moderation actions yet." body="When a reviewer hides or restores a signal, it appears here with their reason." />
  const reviewer = await requireReviewer().catch(() => null)
  const latestBySlug = new Map<string, number>()
  for (const e of data.entries) if (!latestBySlug.has(e.signal_slug)) latestBySlug.set(e.signal_slug, e.id)
  return (
    <ol className="divide-y divide-rule border-y border-rule">
      {data.entries.map((e) => {
        const currentlyHidden = data.hidden.has(e.signal_slug)
        return (
          <li key={e.id} className="grid gap-2 py-4 sm:grid-cols-[11rem_1fr]">
            <div>
              <span className={`meta ${e.action === 'hide' ? 'text-negative' : 'text-positive'}`}>{e.action === 'hide' ? 'Hidden' : 'Restored'}</span>
              <time dateTime={e.created_at} className="meta mt-1 block text-[10px]">
                {formatDateTime(e.created_at)}
              </time>
            </div>
            <div className="min-w-0">
              <p className="font-medium">
                {currentlyHidden ? e.signal_title ?? e.signal_slug : <Link href={`/signals/${e.signal_slug}`} className="hover:text-accent">{e.signal_title ?? e.signal_slug}</Link>}
              </p>
              <p className="mt-1 text-sm text-ink-2">“{e.reason}”</p>
              <p className="meta mt-1 text-[10px]">by {e.actor_name ?? 'reviewer'}</p>
              {reviewer && currentlyHidden && latestBySlug.get(e.signal_slug) === e.id ? (
                <div className="mt-3 max-w-xl">
                  <ModerationForm slug={e.signal_slug} title={e.signal_title ?? e.signal_slug} action="restore" />
                </div>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export default function ModerationPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6">
      <Breadcrumbs items={[{ name: 'Home', href: '/' }, { name: 'Moderation log', href: '/moderation' }]} />
      <h1 className="mt-6 font-serif text-4xl font-medium tracking-[-0.02em] sm:text-5xl">Moderation log</h1>
      <p className="mt-3 mb-10 max-w-2xl text-lg text-ink-2">
        Every hide and restore, with the reviewer’s reason. Nothing is deleted: hidden signals can be restored by any reviewer.{' '}
        <Link href="/reviewers" className="link">
          How reviewing works
        </Link>
      </p>
      <Suspense fallback={<LoadingState rows={4} label="Loading log" />}>
        <Log />
      </Suspense>
    </div>
  )
}
