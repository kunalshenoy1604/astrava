'use client'

import { useActionState } from 'react'
import { moderateSignalAction, type FormState } from '@/lib/reviewers/actions'

/** Reviewer control: hide or restore a signal with a public reason. */
export function ModerationForm({ slug, title, action: mode }: { slug: string; title: string; action: 'hide' | 'restore' }) {
  const [state, action, pending] = useActionState<FormState | null, FormData>(moderateSignalAction, null)
  if (state?.ok) return <p role="status" className="text-sm text-positive">{state.message}</p>
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="action" value={mode} />
      <label htmlFor={`reason-${slug}`} className="label">
        Public reason ({mode === 'hide' ? 'why this should not be public' : 'why it can return'})
      </label>
      <textarea id={`reason-${slug}`} name="reason" autoComplete="off" placeholder="e.g. The linked repository does not contain the claimed benchmark…" rows={3} minLength={20} maxLength={1000} required className="field h-auto py-2 text-sm" />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={mode === 'hide' ? 'btn-primary h-9 bg-negative border-negative' : 'btn-secondary h-9'}>
          {pending ? 'Saving…' : mode === 'hide' ? 'Hide from public view' : 'Restore'}
        </button>
        {state && !state.ok ? <p role="alert" className="text-xs text-negative">{state.message}</p> : null}
      </div>
    </form>
  )
}
