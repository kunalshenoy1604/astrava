/**
 * Builders for the demo dataset. Everything produced here is marked as demo:
 * sources point at example.org (a reserved documentation domain, RFC 2606)
 * and carry `isPlaceholder: true`; series carry `provenance: 'demo'`.
 */
import type { MetricSeries, Source, SourceKind, SourceTier, Statement } from '@/lib/domain/types'

export const DEMO_SNAPSHOT = '2026-09-27T09:00:00.000Z'
/** Monday of the last complete week in the demo snapshot. */
const LAST_WEEK_START = Date.UTC(2026, 8, 21)
const WEEK = 7 * 24 * 60 * 60 * 1000

export const fact = (text: string, ...sourceIds: string[]): Statement => ({ text, kind: 'fact', sourceIds })
export const analysis = (text: string, ...sourceIds: string[]): Statement => ({
  text,
  kind: 'analysis',
  ...(sourceIds.length ? { sourceIds } : {}),
})
export const estimate = (text: string, ...sourceIds: string[]): Statement => ({
  text,
  kind: 'estimate',
  ...(sourceIds.length ? { sourceIds } : {}),
})

export function demoSourceFactory(signalSlug: string) {
  return function source(
    id: string,
    kind: SourceKind,
    tier: SourceTier,
    title: string,
    publisher: string,
    opts: { independent: boolean; publishedAt: string; note?: string },
  ): Source {
    return {
      id,
      kind,
      tier,
      title,
      publisher,
      url: `https://example.org/astrava-demo/${signalSlug}/${id}`,
      publishedAt: opts.publishedAt,
      retrievedAt: DEMO_SNAPSHOT,
      independent: opts.independent,
      isPlaceholder: true,
      ...(opts.note ? { note: opts.note } : {}),
    }
  }
}

/** Weekly series whose last value is the week starting LAST_WEEK_START. */
export function weekly(
  id: string,
  label: string,
  unit: string,
  values: number[],
  sourceId?: string,
  minVolume?: number,
): MetricSeries {
  const n = values.length
  return {
    id,
    label,
    unit,
    provenance: 'demo',
    ...(sourceId ? { sourceId } : {}),
    ...(minVolume ? { minVolume } : {}),
    points: values.map((value, i) => ({
      date: new Date(LAST_WEEK_START - (n - 1 - i) * WEEK).toISOString().slice(0, 10),
      value,
    })),
  }
}

export const day = (iso: string) => `${iso}T12:00:00.000Z`
