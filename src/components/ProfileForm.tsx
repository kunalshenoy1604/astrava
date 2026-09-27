'use client'

import { useActionState } from 'react'
import { updateProfileAction, type AuthState } from '@/lib/auth/actions'

export function ProfileForm({ displayName }: { displayName: string }) {
  const [state, action, pending] = useActionState<AuthState | null, FormData>(updateProfileAction, null)
  return (
    <form action={action} className="mt-4 grid gap-2">
      <label htmlFor="displayName" className="label">
        Display name
      </label>
      <input id="displayName" name="displayName" defaultValue={displayName} maxLength={80} className="field" />
      <button type="submit" disabled={pending} className="btn-secondary h-9">
        {pending ? 'Saving…' : 'Save'}
      </button>
      <p role="status" aria-live="polite" className={`text-xs ${state?.error ? 'text-negative' : 'text-ink-3'}`}>
        {state?.error ?? state?.notice ?? ''}
      </p>
    </form>
  )
}
