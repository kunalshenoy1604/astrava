import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getViewer } from '@/lib/auth/viewer'
import { getRadarTopics, getSavedSlugs } from '@/lib/personal/store'
import { getSummaries, settle } from '@/lib/data/queries'
import { signOutAction } from '@/lib/auth/actions'
import { TOPIC_BY_SLUG } from '@/lib/demo/topics'
import { SignalFeed } from '@/components/SignalFeed'
import { ProfileForm } from '@/components/ProfileForm'
import { ErrorState, LoadingState } from '@/components/States'

export const metadata: Metadata = { title: 'Account', robots: { index: false, follow: false } }

async function Account() {
  const viewer = await getViewer()
  if (!viewer) redirect('/sign-in?next=/account')
  const [topics, saved] = await Promise.all([getRadarTopics(viewer), getSavedSlugs(viewer)])
  const savedSummaries = await settle(getSummaries(saved))
  return (
    <div className="grid gap-12 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <aside className="grid content-start gap-8">
        <section aria-labelledby="profile-h" className="rounded-sm border border-rule p-5">
          <h2 id="profile-h" className="meta text-ink">
            Profile
          </h2>
          <p className="mt-2 text-sm text-ink-2">{viewer.email}</p>
          <p className="meta mt-1 text-[10px]">Role: {viewer.role}</p>
          <ProfileForm displayName={viewer.displayName ?? ''} />
        </section>
        <section aria-labelledby="radar-h">
          <h2 id="radar-h" className="meta text-ink">
            Radar topics
          </h2>
          <p className="mt-2 text-sm text-ink-2">{topics.length ? topics.map((t) => TOPIC_BY_SLUG.get(t)?.name).join(' · ') : 'None selected.'}</p>
          <Link href="/radar" className="btn-secondary mt-3">
            Edit radar
          </Link>
        </section>
        <form action={signOutAction}>
          <button type="submit" className="btn-ghost">
            Sign out
          </button>
        </form>
      </aside>
      <section aria-labelledby="saved-h">
        <h2 id="saved-h" className="mb-4 font-serif text-2xl font-medium">
          Saved signals
        </h2>
        {savedSummaries.ok ? (
          <SignalFeed signals={savedSummaries.value} empty={{ title: 'Nothing saved yet.', body: 'Use “Save” on any signal.', action: { href: '/signals', label: 'Browse signals' } }} />
        ) : (
          <ErrorState />
        )}
      </section>
    </div>
  )
}

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-page px-4 pt-10 sm:px-6">
      <h1 className="mb-8 font-serif text-4xl font-medium tracking-[-0.02em]">Account</h1>
      <Suspense fallback={<LoadingState rows={2} label="Loading account" />}>
        <Account />
      </Suspense>
    </div>
  )
}
