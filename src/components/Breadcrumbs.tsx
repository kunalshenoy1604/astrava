import Link from 'next/link'
import { JsonLd } from './JsonLd'
import { absoluteUrl } from '@/lib/config'

export interface Crumb {
  name: string
  href: string
}

/** Visible breadcrumb trail plus matching BreadcrumbList structured data. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="meta">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((c, i) => (
          <li key={c.href} className="flex items-center gap-2">
            {i > 0 ? <span aria-hidden className="text-rule">/</span> : null}
            {i === items.length - 1 ? (
              <span aria-current="page" className="max-w-[40ch] truncate text-ink-2">
                {c.name}
              </span>
            ) : (
              <Link href={c.href} className="hover:text-accent">
                {c.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: items.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: absoluteUrl(c.href) })),
        }}
      />
    </nav>
  )
}
