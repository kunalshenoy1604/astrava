import Link from 'next/link'
import { requireReviewer } from '@/lib/auth/viewer'
import { ModerationForm } from './ModerationForm'

/** Shown only to reviewers and admins, on signal pages. Streams in behind <Suspense>. */
export async function ReviewerTools({ slug, title }: { slug: string; title: string }) {
  const reviewer = await requireReviewer().catch(() => null)
  if (!reviewer) return null
  return (
    <section aria-label="Reviewer tools" className="mt-8 rounded-sm border border-dashed border-negative/60 p-4">
      <p className="meta text-negative">Reviewer tools · {reviewer.role}</p>
      <p className="mt-1 mb-3 text-sm text-ink-2">
        Hiding removes this signal from every public list and page. Your reason and name are published in the{' '}
        <Link href="/moderation" className="link">
          moderation log
        </Link>
        .
      </p>
      <ModerationForm slug={slug} title={title} action="hide" />
    </section>
  )
}
