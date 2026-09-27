import Link from 'next/link'
import { TOPICS } from '@/lib/demo/topics'
import { LogoMark } from './Logo'

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-rule-strong">
      <div className="mx-auto grid max-w-page gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1.4fr]">
        <div>
          <p className="flex items-center gap-2 font-serif text-lg font-semibold">
            <LogoMark /> Astrava
          </p>
          <p className="mt-3 max-w-xs text-sm text-ink-2">
            Developer intelligence: technical developments gaining momentum before they become standard knowledge.
          </p>
          <p className="meta mt-6 max-w-xs normal-case tracking-normal">
            Early signals are not guaranteed outcomes. Scores are analytical rankings, not predictions.
          </p>
        </div>
        <nav aria-label="Product">
          <p className="meta mb-3">Product</p>
          <ul className="grid gap-2 text-sm">
            <li><Link className="link" href="/signals">All signals</Link></li>
            <li><Link className="link" href="/radar">Your radar</Link></li>
            <li><Link className="link" href="/topics">Topics</Link></li>
            <li><Link className="link" href="/search">Search</Link></li>
          </ul>
        </nav>
        <nav aria-label="Method">
          <p className="meta mb-3">Method</p>
          <ul className="grid gap-2 text-sm">
            <li><Link className="link" href="/methodology">Methodology</Link></li>
            <li><Link className="link" href="/methodology#breakout-score">Breakout Score</Link></li>
            <li><Link className="link" href="/methodology#uncertainty">Uncertainty</Link></li>
            <li><Link className="link" href="/about">About</Link></li>
          </ul>
        </nav>
        <nav aria-label="Topics">
          <p className="meta mb-3">Topics</p>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {TOPICS.map((t) => (
              <li key={t.slug}>
                <Link className="link" href={`/topics/${t.slug}`}>
                  {t.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  )
}
