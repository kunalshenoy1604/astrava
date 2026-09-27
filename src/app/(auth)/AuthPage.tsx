import Link from 'next/link'
import { isGoogleAuthEnabled, isSupabaseConfigured } from '@/lib/config'
import { safeRedirectPath } from '@/lib/security/url'
import { AuthForm } from '@/components/AuthForm'

const ERRORS: Record<string, string> = {
  callback: 'The sign-in link could not be completed. Please try again.',
  confirm: 'That confirmation link is invalid or has expired.',
  oauth: 'Google sign-in could not start. Please try again.',
  rate_limited: 'Too many attempts. Wait a few minutes and try again.',
}

export async function AuthPage({ mode, searchParams }: { mode: 'sign-in' | 'sign-up'; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const next = safeRedirectPath(typeof sp.next === 'string' ? sp.next : null, '/radar')
  const errorKey = typeof sp.error === 'string' ? sp.error : undefined
  return (
    <div className="mx-auto grid max-w-page gap-12 px-4 pt-12 sm:px-6 md:grid-cols-[1fr_24rem] lg:gap-24">
      <div className="max-w-lg">
        <p className="meta">Account</p>
        <h1 className="mt-2 font-serif text-4xl font-medium tracking-[-0.02em] sm:text-5xl">
          {mode === 'sign-in' ? 'Sign in to Astrava' : 'Create your account'}
        </h1>
        <p className="mt-4 text-lg text-ink-2">
          An account keeps your radar and saved signals across devices. Anything you set up before signing in is merged into your
          account.
        </p>
        <ul className="mt-8 grid gap-2 text-sm text-ink-2">
          <li>— Topic radar with live counts</li>
          <li>— Saved signals</li>
          <li>— No email newsletters unless you ask for them</li>
        </ul>
      </div>
      <div className="rounded-sm border border-rule-strong bg-paper-raised p-6">
        {isSupabaseConfigured ? (
          <AuthForm mode={mode} next={next} googleEnabled={isGoogleAuthEnabled} initialError={errorKey ? ERRORS[errorKey] : undefined} />
        ) : (
          <div>
            <p className="meta text-caution">Accounts disabled</p>
            <p className="mt-2 font-medium">This deployment runs on the demo dataset without a database.</p>
            <p className="mt-2 text-sm text-ink-2">
              Sign-in needs Supabase to be configured (see the README). Your radar and saved signals still work — they are stored in
              this browser.
            </p>
            <Link href="/radar" className="btn-primary mt-5 w-full">
              Open my radar
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
