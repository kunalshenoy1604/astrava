import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/viewer'
import { allApplications } from '@/lib/reviewers/queries'
import { DecisionForm } from '@/components/DecisionForm'
import { ApplicationDetails } from '@/components/ApplicationDetails'
import { EmptyState, LoadingState } from '@/components/States'

export const metadata: Metadata = { title: 'Reviewer applications', robots: { index: false, follow: false } }

async function List() {
  if (!(await requireAdmin())) notFound()
  const apps = await allApplications()
  if (apps.length === 0) return <EmptyState title="No applications yet." />
  return (
    <div className="grid gap-6">
      {apps.map((a) => (
        <details key={a.id} open={a.status === 'pending'} className="rounded-sm border border-rule p-4">
          <summary className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-serif text-xl">{a.full_name}</span>
            <span className={`meta ${a.status === 'pending' ? 'text-caution' : a.status === 'approved' ? 'text-positive' : 'text-negative'}`}>
              {a.status} · {new Date(a.created_at).toLocaleDateString('en-GB')}
            </span>
          </summary>
          <div className="mt-4">
            <ApplicationDetails app={a} />
          </div>
          {a.status === 'pending' ? (
            <div className="mt-4">
              <DecisionForm applicationId={a.id} />
            </div>
          ) : null}
        </details>
      ))}
    </div>
  )
}

export default function ApplicationsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 pt-10 sm:px-6">
      <p className="meta">
        <Link href="/admin" className="hover:text-accent">
          ← Admin
        </Link>
      </p>
      <h1 className="mt-2 mb-8 font-serif text-4xl font-medium">Reviewer applications</h1>
      <Suspense fallback={<LoadingState rows={3} label="Loading applications" />}>
        <List />
      </Suspense>
    </div>
  )
}
