import type { ReactNode } from 'react'
import { unstable_rethrow } from 'next/navigation'
import { getViewer } from '@/lib/auth/viewer'
import { getRadarTopics, getSavedSlugs } from '@/lib/personal/store'
import { isSupabaseConfigured } from '@/lib/config'
import { PersonalProvider, type PersonalState } from './PersonalContext'

async function loadPersonalState(): Promise<PersonalState> {
  try {
    const viewer = await getViewer()
    const [saved, radar] = await Promise.all([getSavedSlugs(viewer), getRadarTopics(viewer)])
    return { signedIn: Boolean(viewer), accountsEnabled: isSupabaseConfigured, saved, radar }
  } catch (err) {
    unstable_rethrow(err)
    console.error('[personal] could not load state', err)
    return { signedIn: false, accountsEnabled: isSupabaseConfigured, saved: [], radar: [] }
  }
}

/** Starts the personal-state read without awaiting it; consumers `use()` it behind their own Suspense boundaries. */
export function PersonalRoot({ children }: { children: ReactNode }) {
  return <PersonalProvider value={loadPersonalState()}>{children}</PersonalProvider>
}
