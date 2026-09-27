import Link from 'next/link'
import type { ReactNode } from 'react'

/** Useful empty state: says why it is empty and what to do next. */
export function EmptyState({ title, body, action }: { title: string; body?: ReactNode; action?: { href: string; label: string } }) {
  return (
    <div className="grid-paper rounded-sm border border-dashed border-rule px-5 py-10 text-center">
      <p className="font-serif text-xl">{title}</p>
      {body ? <div className="mx-auto mt-2 max-w-md text-sm text-ink-2">{body}</div> : null}
      {action ? (
        <Link href={action.href} className="btn-secondary mt-5">
          {action.label}
        </Link>
      ) : null}
    </div>
  )
}

export function ErrorState({ title = 'This section could not load.', retryHref }: { title?: string; retryHref?: string }) {
  return (
    <div role="alert" className="rounded-sm border border-negative/40 bg-paper-raised px-5 py-6">
      <p className="meta text-negative">Data unavailable</p>
      <p className="mt-1 font-medium">{title}</p>
      <p className="mt-1 text-sm text-ink-2">
        The data service did not respond. Nothing shown here has been guessed or filled in; try again in a moment.
      </p>
      {retryHref ? (
        <a href={retryHref} className="btn-secondary mt-4">
          Retry
        </a>
      ) : null}
    </div>
  )
}

/** Skeleton rows that mirror the feed layout, so the page does not jump when data arrives. */
export function LoadingState({ rows = 4, label = 'Loading signals' }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}…</span>
      <ul aria-hidden className="divide-y divide-rule border-t border-rule">
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className="grid animate-pulse grid-cols-[4.5rem_1fr] gap-5 py-6">
            <span className="h-12 w-12 bg-paper-sunken" />
            <span className="grid gap-2">
              <span className="h-3 w-40 bg-paper-sunken" />
              <span className="h-5 w-4/5 bg-paper-sunken" />
              <span className="h-3 w-3/5 bg-paper-sunken" />
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
