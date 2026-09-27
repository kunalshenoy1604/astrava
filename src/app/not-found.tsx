import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-page px-4 py-24 sm:px-6">
      <p className="meta">404 · No signal here</p>
      <h1 className="mt-3 max-w-2xl font-serif text-5xl font-medium tracking-[-0.02em]">This page doesn’t exist, or the signal was removed.</h1>
      <p className="mt-4 max-w-xl text-lg text-ink-2">Signals can be hidden when their evidence does not hold up. Try searching, or start from the feed.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/signals" className="btn-primary">
          Browse signals
        </Link>
        <Link href="/search" className="btn-secondary">
          Search
        </Link>
      </div>
    </div>
  )
}
