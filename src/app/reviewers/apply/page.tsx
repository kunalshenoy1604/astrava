import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getViewer } from '@/lib/auth/viewer'
import { myLatestApplication } from '@/lib/reviewers/queries'
import { getFeed, settle } from '@/lib/data/queries'
import { TOPICS } from '@/lib/demo/topics'
import { isSupabaseConfigured } from '@/lib/config'
import { ApplicationForm } from '@/components/ApplicationForm'
import { EmptyState, LoadingState } from '@/components/States'

export const metadata: Metadata = { title: 'Apply to review', robots: { index: false, follow: false } }

async function Form() {
  if (!isSupabaseConfigured) return <EmptyState title="Applications are not open yet." body="Accounts are not enabled on this deployment." />
  const viewer = await getViewer()
  if (!viewer) redirect('/sign-in?next=/reviewers/apply')
  if (viewer.role !== 'member') return <EmptyState title="You already have reviewer access." action={{ href: '/moderation', label: 'Open moderation log' }} />
  const pending = await myLatestApplication(viewer.id).catch(() => null)
  if (pending?.status === 'pending') return <EmptyState title="Your application is under review." body="You will see the decision on your account page." />
  const feed = await settle(getFeed({ limit: 40 }))
  const signals = feed.ok ? feed.value.map((s) => ({ value: s.slug, label: s.title.slice(0, 110) })) : []
  return <ApplicationForm topics={TOPICS.map((t) => ({ value: t.slug, label: t.name }))} signals={signals} defaultName={viewer.displayName ?? ''} />
}

export default function ApplyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 sm:px-6">
      <p className="meta">
        <Link href="/reviewers" className="hover:text-accent">
          ← Reviewer programme
        </Link>
      </p>
      <h1 className="mt-3 font-serif text-4xl font-medium tracking-[-0.02em]">Apply for reviewer access</h1>
      <p className="mt-3 mb-10 text-lg text-ink-2">
        Make your case. The owner reads each application; thin answers are not approved. Your email is shared only with the owner.
      </p>
      <Suspense fallback={<LoadingState rows={3} label="Loading form" />}>
        <Form />
      </Suspense>
    </div>
  )
}
