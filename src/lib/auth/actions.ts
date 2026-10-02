'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { z } from 'zod'
import { createSessionClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/security/rate-limit'
import { safeRedirectPath } from '@/lib/security/url'
import { mergeAnonymousState } from '@/lib/personal/store'
import { siteConfig, type OAuthProvider } from '@/lib/config'
import { enabledProviders } from './providers'

export interface AuthState {
  error?: string
  notice?: string
  email?: string
}

const credentials = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(254),
  password: z.string().min(8, 'Use at least 8 characters.').max(128),
})

async function origin(): Promise<string> {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'https'
  return host ? `${proto}://${host}` : siteConfig.url
}

export async function signInAction(_prev: AuthState | null, formData: FormData): Promise<AuthState> {
  const limited = await rateLimit('auth')
  if (!limited.allowed) return { error: 'Too many attempts. Wait a few minutes and try again.' }
  const parsed = credentials.safeParse({ email: formData.get('email'), password: formData.get('password') })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, email: String(formData.get('email') ?? '') }

  const supabase = await createSessionClient()
  if (!supabase) return { error: 'Accounts are not enabled on this deployment.' }
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data)
  // Deliberately generic: do not reveal whether the email exists.
  if (error || !data.user) return { error: 'Email or password is incorrect.', email: parsed.data.email }

  await mergeAnonymousState(data.user.id)
  redirect(safeRedirectPath(String(formData.get('next') ?? ''), '/radar'))
}

export async function signUpAction(_prev: AuthState | null, formData: FormData): Promise<AuthState> {
  const limited = await rateLimit('auth')
  if (!limited.allowed) return { error: 'Too many attempts. Wait a few minutes and try again.' }
  const parsed = credentials.safeParse({ email: formData.get('email'), password: formData.get('password') })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, email: String(formData.get('email') ?? '') }

  const supabase = await createSessionClient()
  if (!supabase) return { error: 'Accounts are not enabled on this deployment.' }
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${await origin()}/auth/confirm?next=/radar` },
  })
  if (error) return { error: 'Could not create the account. Check the details and try again.', email: parsed.data.email }

  if (data.session && data.user) {
    await mergeAnonymousState(data.user.id)
    redirect('/radar')
  }
  return { notice: 'Check your inbox to confirm your email address, then sign in.', email: parsed.data.email }
}

/** Starts an OAuth (PKCE) sign-in with any enabled provider: Google, X, GitHub, LinkedIn, … */
export async function signInWithProviderAction(formData: FormData): Promise<void> {
  const limited = await rateLimit('auth')
  if (!limited.allowed) redirect('/sign-in?error=rate_limited')
  const provider = String(formData.get('provider') ?? '')
  if (!((await enabledProviders()) as string[]).includes(provider)) redirect('/sign-in?error=oauth')
  const supabase = await createSessionClient()
  if (!supabase) redirect('/sign-in')
  const next = safeRedirectPath(String(formData.get('next') ?? ''), '/radar')
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider as OAuthProvider,
    options: { redirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}` },
  })
  if (error || !data.url) redirect('/sign-in?error=oauth')
  redirect(data.url)
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSessionClient()
  await supabase?.auth.signOut()
  redirect('/')
}

export async function updateProfileAction(_prev: AuthState | null, formData: FormData): Promise<AuthState> {
  const name = z.string().trim().min(1, 'Enter a name.').max(80).safeParse(formData.get('displayName'))
  if (!name.success) return { error: name.error.issues[0]?.message }
  const supabase = await createSessionClient()
  const { data } = (await supabase?.auth.getUser()) ?? { data: { user: null } }
  if (!supabase || !data.user) return { error: 'You are signed out.' }
  const { error } = await supabase
    .from('profiles')
    .update({ display_name: name.data, updated_at: new Date().toISOString() })
    .eq('id', data.user.id)
  return error ? { error: 'Could not save your profile.' } : { notice: 'Profile saved.' }
}
