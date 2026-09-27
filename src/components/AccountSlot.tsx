import Link from 'next/link'
import { getViewer } from '@/lib/auth/viewer'

/** Header account area. Reads the session, so it streams in behind <Suspense>. */
export async function AccountSlot() {
  const viewer = await getViewer()
  if (!viewer) {
    return (
      <Link href="/sign-in" className="btn-ghost h-9 text-sm">
        Sign in
      </Link>
    )
  }
  const label = viewer.displayName ?? viewer.email ?? 'Account'
  return (
    <span className="flex items-center gap-1">
      {viewer.role === 'admin' ? (
        <Link href="/admin" className="btn-ghost meta h-9">
          Admin
        </Link>
      ) : null}
      <Link href="/account" className="btn-ghost h-9 text-sm" title={viewer.email ?? undefined}>
        <span aria-hidden className="inline-flex size-6 items-center justify-center rounded-full bg-ink font-mono text-[11px] text-paper uppercase">
          {label.slice(0, 1)}
        </span>
        <span className="sr-only">Account: {label}</span>
      </Link>
    </span>
  )
}

export function AccountSlotFallback() {
  return (
    <Link href="/sign-in" className="btn-ghost h-9 text-sm">
      Sign in
    </Link>
  )
}
