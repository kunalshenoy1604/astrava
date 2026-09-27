'use client'

import { useEffect } from 'react'

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])
  return (
    <div role="alert" className="mx-auto max-w-page px-4 py-24 sm:px-6">
      <p className="meta text-negative">Something went wrong</p>
      <h1 className="mt-3 max-w-2xl font-serif text-4xl font-medium">This page could not be rendered.</h1>
      <p className="mt-4 max-w-xl text-ink-2">
        Nothing has been guessed or filled in. Try again; if it keeps failing, the data service may be unavailable.
        {error.digest ? <span className="meta mt-2 block">Reference {error.digest}</span> : null}
      </p>
      <button type="button" onClick={reset} className="btn-primary mt-8">
        Try again
      </button>
    </div>
  )
}
