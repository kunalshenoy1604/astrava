'use client'

import { Suspense, useActionState, useOptimistic } from 'react'
import { Bookmark, BookmarkCheck } from 'lucide-react'
import { toggleSavedAction, type ActionResult } from '@/lib/personal/actions'
import { usePersonalState } from './PersonalContext'

function Shell({ saved = false, pending = false, label }: { saved?: boolean; pending?: boolean; label?: string }) {
  const Icon = saved ? BookmarkCheck : Bookmark
  return (
    <>
      <Icon aria-hidden className={`size-4 ${saved ? 'text-accent' : ''}`} />
      <span>{label ?? (saved ? 'Saved' : 'Save')}</span>
      {pending ? <span className="sr-only">Updating</span> : null}
    </>
  )
}

const buttonClass =
  'meta inline-flex h-8 items-center gap-1.5 rounded-sm px-2 text-ink-2 hover:bg-paper-sunken hover:text-ink disabled:opacity-60 transition-colors'

function Inner({ slug, title }: { slug: string; title: string }) {
  const personal = usePersonalState()
  const isSaved = personal.saved.includes(slug)
  const [optimisticSaved, setOptimisticSaved] = useOptimistic(isSaved)
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(async (prev, fd) => {
    setOptimisticSaved(fd.get('intent') === 'save')
    return toggleSavedAction(prev, fd)
  }, null)

  return (
    <form action={action} className="inline-flex items-center gap-2">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="intent" value={optimisticSaved ? 'unsave' : 'save'} />
      <button
        type="submit"
        aria-pressed={optimisticSaved}
        aria-label={`${optimisticSaved ? 'Remove from saved' : 'Save'}: ${title}`}
        disabled={pending}
        className={buttonClass}
      >
        <Shell saved={optimisticSaved} pending={pending} />
      </button>
      <span role="status" aria-live="polite" className="meta text-[10px]">
        {state && !state.ok ? <span className="text-negative">{state.message}</span> : null}
      </span>
    </form>
  )
}

/** Save / unsave. Works for signed-out visitors (stored in a first-party cookie) and signed-in users (stored in the account). */
export function SaveSignalButton({ slug, title }: { slug: string; title: string }) {
  return (
    <Suspense
      fallback={
        <span className={`${buttonClass} opacity-60`} aria-hidden>
          <Shell />
        </span>
      }
    >
      <Inner slug={slug} title={title} />
    </Suspense>
  )
}
