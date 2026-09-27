import { NextResponse, type NextRequest } from 'next/server'
import { searchEverything } from '@/lib/data/queries'
import { MAX_QUERY_LENGTH, normalizeQuery } from '@/lib/search/rank'
import { hit, RATE_LIMITS } from '@/lib/security/rate-limit'

/** JSON search endpoint used by the ⌘K dialog. Rate-limited per IP. */
export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const limit = hit(`search:${ip}`, RATE_LIMITS.search)
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(Math.ceil(limit.retryAfterMs / 1000)) } })
  }
  const raw = request.nextUrl.searchParams.get('q') ?? ''
  if (raw.length > MAX_QUERY_LENGTH * 2) return NextResponse.json({ error: 'Query too long' }, { status: 400 })
  const q = normalizeQuery(raw)
  if (q.length < 2) return NextResponse.json({ results: [] })
  try {
    const results = await searchEverything(q)
    return NextResponse.json({ results }, { headers: { 'Cache-Control': 'private, max-age=30' } })
  } catch (err) {
    console.error('[search]', err)
    return NextResponse.json({ error: 'Search unavailable' }, { status: 503 })
  }
}
