'use client'

import { useSyncExternalStore } from 'react'
import { formatDate, relativeTime } from '@/lib/format'

/**
 * Server renders the absolute UTC date (stable, cacheable, crawlable); the
 * client swaps in "47 min ago" and keeps it current once a minute.
 */
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | null = null
let now = 0

function subscribe(cb: () => void) {
  listeners.add(cb)
  if (!timer) {
    now = Date.now()
    timer = setInterval(() => {
      now = Date.now()
      listeners.forEach((l) => l())
    }, 60_000)
  }
  return () => {
    listeners.delete(cb)
    if (listeners.size === 0 && timer) {
      clearInterval(timer)
      timer = null
    }
  }
}

const getSnapshot = () => now || (now = Date.now())
const getServerSnapshot = () => 0

export function RelativeTime({ iso, className }: { iso: string; className?: string }) {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return (
    <time dateTime={iso} title={new Date(iso).toUTCString()} className={className}>
      {current === 0 ? formatDate(iso) : relativeTime(iso, current)}
    </time>
  )
}
