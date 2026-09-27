import { TOPIC_BY_SLUG } from '@/lib/demo/topics'

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const shortDateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const dateTimeFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
  hour12: false,
})
const numberFmt = new Intl.NumberFormat('en-US')
const compactFmt = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })

export const formatDate = (iso: string) => dateFmt.format(new Date(iso))
export const formatShortDate = (iso: string) => shortDateFmt.format(new Date(iso))
export const formatDateTime = (iso: string) => `${dateTimeFmt.format(new Date(iso))} UTC`
export const formatNumber = (n: number) => numberFmt.format(n)
export const formatCompact = (n: number) => compactFmt.format(n)
export const formatRatio = (r: number | null) => (r === null ? '—' : `${r.toFixed(1)}×`)
export const formatPoints = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

export function topicName(slug: string): string {
  return TOPIC_BY_SLUG.get(slug)?.name ?? slug.replace(/-/g, ' ')
}

/** Relative time used on the client; the server renders the absolute date. */
export function relativeTime(iso: string, now: number): string {
  const diff = Math.max(0, now - Date.parse(iso))
  const min = Math.round(diff / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  const h = Math.round(min / 60)
  if (h < 24) return `${h} hr ago`
  const d = Math.round(h / 24)
  if (d < 30) return `${d} day${d === 1 ? '' : 's'} ago`
  return formatDate(iso)
}
