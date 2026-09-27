import { NextResponse, type NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'
import { timingSafeEqual } from 'node:crypto'
import { runPipeline } from '@/lib/pipeline/run'
import { enabledAdapters } from '@/lib/pipeline/sources'
import { SupabasePipelineStore } from '@/lib/pipeline/store'
import { pipelineEnvFromProcess } from '@/lib/pipeline/env'
import { createServiceClient } from '@/lib/supabase/service'
import { SIGNALS_TAG } from '@/lib/data/queries'

export const maxDuration = 300

function authorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  const header = request.headers.get('authorization') ?? ''
  if (!secret || secret.length < 16) return false
  const expected = Buffer.from(`Bearer ${secret}`)
  const given = Buffer.from(header)
  return given.length === expected.length && timingSafeEqual(given, expected)
}

/**
 * Hourly ingestion entry point. Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
 * Runs the pipeline with the service-role client, then invalidates cached feeds.
 */
export async function GET(request: NextRequest) {
  if (!authorised(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !(process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY)) {
    return NextResponse.json({ error: 'Supabase is not configured; the pipeline needs a database to write to.' }, { status: 503 })
  }
  const env = pipelineEnvFromProcess()
  try {
    const result = await runPipeline({
      adapters: enabledAdapters(env),
      store: new SupabasePipelineStore(createServiceClient()),
      env,
    })
    if (result.stats.stored > 0) revalidateTag(SIGNALS_TAG, 'max')
    return NextResponse.json(result)
  } catch (err) {
    console.error('[pipeline] run failed', err)
    return NextResponse.json({ error: 'Pipeline run failed' }, { status: 500 })
  }
}
