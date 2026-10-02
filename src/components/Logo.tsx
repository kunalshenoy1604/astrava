import Link from 'next/link'

/** Mark: a baseline with a small early spike, and a dot ahead of it — the signal before the signal. */
export function LogoMark({ className = 'size-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path d="M2 16h5l2.2-7 2.6 12 2.2-9H18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="21" cy="12" r="2" className="fill-accent" />
    </svg>
  )
}

export function Logo() {
  return (
    <Link href="/" className="inline-flex items-center gap-2 text-ink" aria-label="Astrava home">
      <LogoMark />
      <span translate="no" className="font-serif text-[1.35rem] leading-none font-semibold tracking-[-0.02em]">Astrava</span>
    </Link>
  )
}
