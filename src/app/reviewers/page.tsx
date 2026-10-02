import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { getViewer } from '@/lib/auth/viewer'
import { myLatestApplication } from '@/lib/reviewers/queries'
import { isSupabaseConfigured } from '@/lib/config'
import { Breadcrumbs } from '@/components/Breadcrumbs'

export const metadata: Metadata = {
  title: 'Become a reviewer',
  description:
    'Astrava reviewers check signals against their sources and can remove misleading ones from public view. Access is granted by application, and every action is logged publicly.',
  alternates: { canonical: '/reviewers' },
}

const PRINCIPLES: [string, string][] = [
  ['Verifiability', 'Judge a signal by whether its linked sources support what it says — not by whether you like the project.'],
  ['Public reasons', 'Every hide or restore needs a written reason. Reasons and reviewer names are published in the moderation log.'],
  ['No conflicts', 'Recuse yourself from projects you work on, invest in, or compete with. Declare conflicts when applying.'],
  ['Hide, never delete', 'Moderation removes a signal from public view. The record and the log remain, and any reviewer can restore it with a reason.'],
  ['Proportionality', 'Hide for fabrication, spam, harmful content, or claims the sources contradict. Weak-but-honest signals stay; the score already reflects weak evidence.'],
]

async function Status() {
  if (!isSupabaseConfigured) return <p className="text-sm text-ink-3">Applications open once accounts are enabled on this deployment.</p>
  const viewer = await getViewer()
  if (!viewer)
    return (
      <Link href="/sign-in?next=/reviewers/apply" className="btn-primary h-11 px-6">
        Sign in to apply
      </Link>
    )
  if (viewer.role !== 'member') return <p className="border-l-2 border-positive pl-3">You have {viewer.role} access. Thank you for reviewing.</p>
  const app = await myLatestApplication(viewer.id).catch(() => null)
  if (app?.status === 'pending')
    return <p className="border-l-2 border-caution pl-3">Your application from {new Date(app.created_at).toLocaleDateString('en-GB')} is under review.</p>
  return (
    <div className="grid gap-2">
      {app?.status === 'rejected' ? (
        <p className="text-sm text-ink-2">Your previous application was not approved{app.decision_note ? `: “${app.decision_note}”` : '.'} You may apply again.</p>
      ) : null}
      <Link href="/reviewers/apply" className="btn-primary h-11 w-fit px-6">
        Start an application
      </Link>
    </div>
  )
}

export default function ReviewersPage() {
  return (
    <div className="mx-auto max-w-page px-4 pt-8 sm:px-6">
      <Breadcrumbs items={[{ name: 'Home', href: '/' }, { name: 'Reviewers', href: '/reviewers' }]} />
      <div className="mt-6 grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <article className="max-w-3xl">
          <p className="meta">Reviewer programme</p>
          <h1 className="mt-2 font-serif text-4xl font-medium tracking-[-0.02em] sm:text-6xl">Keep the signal honest</h1>
          <p className="mt-5 text-xl leading-relaxed text-ink-2">
            Automated collection finds early signals; people keep them trustworthy. Reviewers read signals against their sources and can
            remove misleading ones from public view — with a public reason, like editors on an encyclopedia.
          </p>
          <h2 className="mt-12 border-t border-rule-strong pt-6 font-serif text-3xl font-medium">Principles</h2>
          <dl className="mt-6 grid gap-6">
            {PRINCIPLES.map(([t, d], i) => (
              <div key={t} className="grid gap-1 sm:grid-cols-[3rem_1fr]">
                <span className="numeric text-sm text-accent">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <dt className="font-serif text-xl">{t}</dt>
                  <dd className="mt-1 text-ink-2">{d}</dd>
                </div>
              </div>
            ))}
          </dl>
          <h2 className="mt-12 border-t border-rule-strong pt-6 font-serif text-3xl font-medium">How access is granted</h2>
          <ol className="mt-4 grid list-decimal gap-2 pl-5 text-[17px] text-ink-2">
            <li>You make your case in a structured application: who you are, why, your experience, and a sample review of a live signal.</li>
            <li>The application is sent to the site owner, who reads every one personally.</li>
            <li>If approved, reviewer tools appear on signal pages for your account. Approval can be withdrawn.</li>
          </ol>
          <p className="mt-6 text-sm text-ink-3">
            Every moderation action is visible in the <Link href="/moderation" className="link">public moderation log</Link>.
          </p>
        </article>
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-sm border border-rule-strong p-5">
            <p className="meta text-ink">Apply</p>
            <p className="mt-2 mb-4 text-sm text-ink-2">Takes about 20 minutes. Requires an account.</p>
            <Suspense fallback={<div className="h-11 animate-pulse bg-paper-sunken" />}>
              <Status />
            </Suspense>
          </div>
        </aside>
      </div>
    </div>
  )
}
