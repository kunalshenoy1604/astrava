'use client'

import { useActionState, useRef } from 'react'
import { saveRadarAction, type ActionResult } from '@/lib/personal/actions'
import type { Topic } from '@/lib/domain/types'

/**
 * Topic picker. A plain form with checkboxes and a submit button (works
 * without JavaScript); with JavaScript, each change saves immediately.
 */
export function RadarSelector({ topics, selected, counts }: { topics: Topic[]; selected: string[]; counts: Record<string, number> }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveRadarAction, null)
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <form ref={formRef} action={action} aria-describedby="radar-help">
      <fieldset>
        <legend className="meta mb-3 text-ink">My radar</legend>
        <ul className="divide-y divide-rule border-y border-rule">
          {topics.map((t) => {
            const id = `radar-${t.slug}`
            return (
              <li key={t.slug}>
                <label htmlFor={id} className="group flex cursor-pointer items-center gap-3 py-2.5">
                  <input
                    id={id}
                    type="checkbox"
                    name="topic"
                    value={t.slug}
                    defaultChecked={selected.includes(t.slug)}
                    onChange={() => formRef.current?.requestSubmit()}
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden
                    className="flex size-3.5 items-center justify-center rounded-full border border-ink-3 peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus"
                  />
                  <span className="flex-1 text-sm group-hover:text-ink peer-checked:font-medium">{t.name}</span>
                  <span className="numeric text-xs text-ink-3">{counts[t.slug] ?? 0}</span>
                </label>
              </li>
            )
          })}
        </ul>
      </fieldset>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p id="radar-help" role="status" aria-live="polite" className="text-xs text-ink-3">
          {pending ? 'Saving…' : state?.message ?? 'Changes save automatically.'}
        </p>
        <noscript>
          <button type="submit" className="btn-secondary h-8">
            Save radar
          </button>
        </noscript>
      </div>
    </form>
  )
}
