import Link from 'next/link'
import { Suspense } from 'react'
import { Menu } from 'lucide-react'
import { Logo } from './Logo'
import { NavLinks, NavList } from './NavLinks'
import { SearchCommand } from './SearchCommand'
import { AccountSlot, AccountSlotFallback } from './AccountSlot'
import { ThemeToggle } from './ThemeToggle'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-paper/92 backdrop-blur-sm supports-[backdrop-filter]:bg-paper/80">
      <div className="mx-auto flex h-14 max-w-page items-center gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Primary" className="ml-4 hidden lg:block">
          <Suspense fallback={<NavList />}>
            <NavLinks />
          </Suspense>
        </nav>
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <SearchCommand />
          <span className="hidden sm:inline-flex">
            <ThemeToggle />
          </span>
          <Suspense fallback={<AccountSlotFallback />}>
            <AccountSlot />
          </Suspense>
          <Link href="/radar" className="btn-primary hidden h-9 md:inline-flex">
            Create radar
          </Link>
          {/* Mobile navigation: native disclosure, no JavaScript required */}
          <details className="group relative lg:hidden">
            <summary className="inline-flex size-9 items-center justify-center rounded-sm text-ink hover:bg-paper-sunken" aria-label="Menu">
              <Menu aria-hidden className="size-5" />
            </summary>
            <div className="fixed inset-x-0 top-14 z-50 border-b border-rule bg-paper px-4 pt-4 pb-6 shadow-overlay">
              <nav aria-label="Mobile">
                <Suspense fallback={<NavList variant="sheet" />}>
                  <NavLinks variant="sheet" />
                </Suspense>
              </nav>
              <div className="mt-4 flex items-center justify-between border-t border-rule pt-4">
                <Link href="/radar" className="btn-primary">
                  Create radar
                </Link>
                <ThemeToggle />
              </div>
            </div>
          </details>
        </div>
      </div>
    </header>
  )
}
