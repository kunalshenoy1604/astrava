'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { signInAction, signUpAction, signInWithProviderAction, type AuthState } from '@/lib/auth/actions'

export function AuthForm({
  mode,
  next,
  providers,
  initialError,
}: {
  mode: 'sign-in' | 'sign-up'
  next: string
  providers: { id: string; label: string }[]
  initialError?: string
}) {
  const [state, action, pending] = useActionState<AuthState | null, FormData>(mode === 'sign-in' ? signInAction : signUpAction, null)
  const error = state?.error ?? (state ? undefined : initialError)
  return (
    <div className="grid gap-6">
      <form action={action} className="grid gap-4" noValidate>
        <input type="hidden" name="next" value={next} />
        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            spellCheck={false}
            autoCapitalize="none"
            placeholder="you@company.com…"
            autoComplete="email"
            required
            defaultValue={state?.email ?? ''}
            className="field"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'auth-error' : undefined}
          />
        </div>
        <div>
          <label htmlFor="password" className="label">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
            required
            minLength={8}
            className="field"
            aria-describedby={mode === 'sign-up' ? 'pw-help' : undefined}
          />
          {mode === 'sign-up' ? (
            <p id="pw-help" className="mt-1 text-xs text-ink-3">
              At least 8 characters.
            </p>
          ) : null}
        </div>
        {error ? (
          <p id="auth-error" role="alert" className="text-sm text-negative">
            {error}
          </p>
        ) : null}
        {state?.notice ? (
          <p role="status" className="border-l-2 border-positive pl-3 text-sm">
            {state.notice}
          </p>
        ) : null}
        <button type="submit" disabled={pending} className="btn-primary h-11 w-full">
          {pending ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      {providers.length ? (
        <div className="grid gap-2">
          <div className="meta flex items-center gap-3 before:h-px before:flex-1 before:bg-rule after:h-px after:flex-1 after:bg-rule">or continue with</div>
          <div className={`grid gap-2 ${providers.length > 1 ? 'grid-cols-2' : ''}`}>
            {providers.map((p) => (
              <form key={p.id} action={signInWithProviderAction}>
                <input type="hidden" name="provider" value={p.id} />
                <input type="hidden" name="next" value={next} />
                <button type="submit" className="btn-secondary h-11 w-full">
                  {p.label}
                </button>
              </form>
            ))}
          </div>
        </div>
      ) : null}

      <p className="text-sm text-ink-2">
        {mode === 'sign-in' ? (
          <>
            New here?{' '}
            <Link href={`/sign-up?next=${encodeURIComponent(next)}`} className="link text-ink">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <Link href={`/sign-in?next=${encodeURIComponent(next)}`} className="link text-ink">
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  )
}
