'use client'

import { useActionState } from 'react'
import { decideApplicationAction, type FormState } from '@/lib/reviewers/actions'

/** Approve / reject. Submitted as a POST so link scanners cannot trigger it. */
export function DecisionForm({ token, applicationId }: { token?: string; applicationId?: string }) {
  const [state, action, pending] = useActionState<FormState | null, FormData>(decideApplicationAction, null)
  if (state?.ok) return <p role="status" className="border-l-2 border-positive pl-3">{state.message}</p>
  return (
    <form action={action} className="grid gap-3">
      {token ? <input type="hidden" name="token" value={token} /> : null}
      {applicationId ? <input type="hidden" name="applicationId" value={applicationId} /> : null}
      <label htmlFor={`note-${applicationId ?? 'token'}`} className="label">
        Note to the applicant (optional)
      </label>
      <textarea id={`note-${applicationId ?? 'token'}`} name="note" rows={2} maxLength={1000} className="field h-auto py-2" />
      <div className="flex gap-3">
        <button type="submit" name="decision" value="approved" disabled={pending} className="btn-primary">
          Approve and grant reviewer access
        </button>
        <button type="submit" name="decision" value="rejected" disabled={pending} className="btn-secondary">
          Reject
        </button>
      </div>
      {state && !state.ok ? <p role="alert" className="text-sm text-negative">{state.message}</p> : null}
    </form>
  )
}
