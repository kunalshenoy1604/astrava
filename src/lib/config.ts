/**
 * Runtime configuration. Only NEXT_PUBLIC_* values are readable in the browser;
 * secrets (service-role key, cron secret, source API tokens) are read in
 * server-only modules.
 */
export const siteConfig = {
  name: 'Astrava',
  tagline: 'The signals before the signals',
  description:
    'Astrava tracks technical developments across AI, developer tools, infrastructure, security, robotics and quantum computing that are gaining momentum before they become standard developer knowledge.',
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
  locale: 'en_US',
} as const

export function absoluteUrl(path = '/'): string {
  return `${siteConfig.url}${path.startsWith('/') ? path : `/${path}`}`
}

export interface PublicSupabaseConfig {
  url: string
  key: string
}

export function getPublicSupabaseConfig(): PublicSupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return url && key ? { url, key } : null
}

export const isSupabaseConfigured = getPublicSupabaseConfig() !== null

/** Social sign-in providers supported by Supabase Auth that this app can show. */
export const OAUTH_PROVIDERS = {
  google: 'Google',
  x: 'X',
  github: 'GitHub',
  linkedin_oidc: 'LinkedIn',
  apple: 'Apple',
  discord: 'Discord',
  gitlab: 'GitLab',
} as const
export type OAuthProvider = keyof typeof OAUTH_PROVIDERS
