'use client'

import { createContext, use, type ReactNode } from 'react'

export interface PersonalState {
  signedIn: boolean
  accountsEnabled: boolean
  saved: string[]
  radar: string[]
}

const PersonalContext = createContext<Promise<PersonalState> | null>(null)

/**
 * Carries a promise of the visitor's personal state (saved signals, radar).
 * The promise is created on the server without being awaited, so cached
 * public content prerenders into the static shell and only the small
 * components that `use()` it stream in at request time.
 */
export function PersonalProvider({ value, children }: { value: Promise<PersonalState>; children: ReactNode }) {
  return <PersonalContext value={value}>{children}</PersonalContext>
}

export function usePersonalState(): PersonalState {
  const promise = use(PersonalContext)
  if (!promise) throw new Error('usePersonalState must be used inside PersonalProvider')
  return use(promise)
}
