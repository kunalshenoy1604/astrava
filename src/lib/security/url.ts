/**
 * URL validation for anything rendered as a link or fetched by the pipeline.
 * Only absolute http(s) URLs without embedded credentials are accepted, which
 * rules out javascript:, data:, file: and similar schemes.
 */
export function isSafeHttpUrl(value: string): boolean {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false
  if (url.username || url.password) return false
  if (!url.hostname || !url.hostname.includes('.')) return false
  return true
}

/** Returns the URL if safe, otherwise null. Use at render time for external links. */
export function safeHref(value: string | null | undefined): string | null {
  return value && isSafeHttpUrl(value) ? value : null
}

/** Host without leading www., for compact source display. */
export function displayHost(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/**
 * Only allow same-site relative redirects (e.g. after sign-in). Rejects
 * protocol-relative (//evil.com) and backslash tricks.
 */
export function safeRedirectPath(value: string | null | undefined, fallback = '/'): string {
  if (!value || typeof value !== 'string') return fallback
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback
  return value
}
