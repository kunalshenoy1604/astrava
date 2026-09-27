import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AuthPage } from '../AuthPage'
import { LoadingState } from '@/components/States'

export const metadata: Metadata = {
  title: 'Create account',
  robots: { index: false, follow: false },
  alternates: { canonical: '/sign-up' },
}

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-page px-4 pt-12 sm:px-6"><LoadingState rows={1} label="Loading" /></div>}>
      <AuthPage mode="sign-up" searchParams={searchParams} />
    </Suspense>
  )
}
