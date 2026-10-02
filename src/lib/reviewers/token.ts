import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Signed, expiring decision links for reviewer applications. The link only
 * opens a confirmation page; the decision itself is a POST, so email link
 * scanners that prefetch URLs cannot approve anyone.
 */
const TTL_MS = 14 * 24 * 3600 * 1000

function secret(): string {
  const s = process.env.REVIEW_TOKEN_SECRET ?? process.env.CRON_SECRET
  if (!s || s.length < 16) throw new Error('REVIEW_TOKEN_SECRET (or CRON_SECRET) of at least 16 characters is required')
  return s
}

const b64 = (b: Buffer | string) => Buffer.from(b).toString('base64url')

export function signDecisionToken(applicationId: string, now = Date.now()): string {
  const payload = b64(JSON.stringify({ a: applicationId, e: now + TTL_MS }))
  const sig = b64(createHmac('sha256', secret()).update(payload).digest())
  return `${payload}.${sig}`
}

export function verifyDecisionToken(token: string | null | undefined, now = Date.now()): { applicationId: string } | null {
  if (!token || typeof token !== 'string' || token.length > 512) return null
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  let expected: Buffer
  try {
    expected = createHmac('sha256', secret()).update(payload).digest()
  } catch {
    return null
  }
  const given = Buffer.from(sig, 'base64url')
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null
  try {
    const { a, e } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { a: string; e: number }
    if (typeof a !== 'string' || typeof e !== 'number' || e < now) return null
    return { applicationId: a }
  } catch {
    return null
  }
}
