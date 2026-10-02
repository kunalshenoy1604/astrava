import type { Metadata } from 'next'
import { Suspense } from 'react'
import { applicationForToken } from '@/lib/reviewers/queries'
import { DecisionForm } from '@/components/DecisionForm'
import { EmptyState, LoadingState } from '@/components/States'
import { ApplicationDetails } from '@/components/ApplicationDetails'

export const metadata: Metadata = { title: 'Decide application', robots: { index: false, follow: false } }

async function Decision({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const token = (await searchParams).token
  const t = typeof token === 'string' ? token : undefined
  const app = await applicationForToken(t).catch(() => null)
  if (!app || !t) return <EmptyState title="This link is invalid or has expired." body="Open the application from the admin area instead." />
  return (
    <>
      <h1 className="font-serif text-4xl font-medium">{app.full_name}</h1>
      <p className="meta mt-2">
        Submitted {new Date(app.created_at).toUTCString()} · status: <span className="text-ink">{app.status}</span>
      </p>
      <div className="mt-8">
        <ApplicationDetails app={app} />
      </div>
      <div className="mt-8">{app.status === 'pending' ? <DecisionForm token={t} /> : <p>Already {app.status}.</p>}</div>
    </>
  )
}

export default function DecisionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 sm:px-6">
      <p className="meta mb-4">Reviewer application · owner decision</p>
      <Suspense fallback={<LoadingState rows={2} label="Loading application" />}>
        <Decision searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
