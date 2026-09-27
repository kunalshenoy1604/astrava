'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export const NAV = [
  { href: '/signals', label: 'Signals' },
  { href: '/radar', label: 'Radar' },
  { href: '/topics', label: 'Topics' },
  { href: '/methodology', label: 'Methodology' },
  { href: '/about', label: 'About' },
] as const

export function NavLinks({ variant = 'bar' }: { variant?: 'bar' | 'sheet' }) {
  return <NavList variant={variant} pathname={usePathname()} />
}

/** Hook-free rendering, used as the prerendered fallback while the pathname is unknown. */
export function NavList({ variant = 'bar', pathname = '' }: { variant?: 'bar' | 'sheet'; pathname?: string }) {
  return (
    <ul className={variant === 'bar' ? 'flex items-center gap-1' : 'grid gap-1'}>
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={
                variant === 'bar'
                  ? `relative px-2.5 py-2 text-sm transition-colors ${active ? 'text-ink' : 'text-ink-2 hover:text-ink'} after:absolute after:inset-x-2.5 after:-bottom-[13px] after:h-[2px] ${active ? 'after:bg-accent' : 'after:bg-transparent'}`
                  : `block py-2 font-serif text-2xl ${active ? 'text-accent' : 'text-ink'}`
              }
            >
              {item.label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
