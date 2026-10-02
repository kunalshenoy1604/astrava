'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Search, X } from 'lucide-react'
import type { SearchResult } from '@/lib/domain/types'

const TYPE_LABEL: Record<SearchResult['type'], string> = {
  signal: 'Signal',
  topic: 'Topic',
  technology: 'Technology',
  company: 'Company',
  paper: 'Paper',
  repository: 'Project',
  organization: 'Organisation',
  standard: 'Standard',
}

const SUGGESTIONS = ['inference', 'agents', 'sandbox', 'post-quantum', 'robotics', 'postgres']
const DEBOUNCE_MS = 140

type Status = 'idle' | 'loading' | 'done' | 'error'

/**
 * Global search (⌘K / Ctrl+K or "/"). Progressive enhancement: the trigger is
 * a link to /search, which works without JavaScript; with JS it opens this
 * dialog, which queries /api/search as you type.
 */
export function SearchCommand() {
  const router = useRouter()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const [active, setActive] = useState(0)
  const listId = useId()

  const open = useCallback(() => {
    const d = dialogRef.current
    if (!d || d.open) return
    d.showModal()
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])
  const close = useCallback(() => dialogRef.current?.close(), [])

  // Global shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const typing = target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        open()
      } else if (e.key === '/' && !typing) {
        e.preventDefault()
        open()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Debounced fetch with cancellation
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setStatus('idle')
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setStatus('loading')
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        if (!res.ok) throw new Error(String(res.status))
        const body = (await res.json()) as { results: SearchResult[] }
        setResults(body.results)
        setActive(0)
        setStatus('done')
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setStatus('error')
      }
    }, DEBOUNCE_MS)
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [query])

  function go(href: string) {
    close()
    router.push(href)
  }

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const hit = results[active]
      if (hit) go(hit.href)
      else if (query.trim()) go(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  const optionId = (i: number) => `${listId}-opt-${i}`

  return (
    <>
      <a
        href="/search"
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey) return
          e.preventDefault()
          open()
        }}
        className="inline-flex h-9 items-center gap-2 rounded-sm border border-rule px-2.5 text-sm text-ink-2 transition-colors hover:border-ink hover:text-ink md:w-52"
        aria-keyshortcuts="Control+K Meta+K /"
      >
        <Search aria-hidden className="size-4" />
        <span className="hidden md:inline">Search</span>
        <span className="sr-only md:hidden">Search</span>
        <kbd className="meta ml-auto hidden rounded-xs border border-rule px-1 text-[10px] md:inline">⌘K</kbd>
      </a>

      <dialog
        ref={dialogRef}
        aria-label="Search Astrava"
        onClick={(e) => {
          if (e.target === dialogRef.current) close()
        }}
        className="m-0 mx-auto mt-[8vh] w-[min(40rem,calc(100vw-2rem))] max-w-none rounded-md border border-rule bg-paper-raised p-0 text-ink shadow-overlay backdrop:bg-ink/40 backdrop:backdrop-blur-[2px]"
      >
        <div className="flex items-center gap-2 border-b border-rule px-4 focus-within:shadow-[inset_0_-2px_0_0_var(--a-focus)]">
          <Search aria-hidden className="size-4 text-ink-3" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value.slice(0, 120))}
            onKeyDown={onInputKey}
            placeholder="Search signals, technologies, papers, projects…"
            className="h-14 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-ink-3"
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls={listId}
            aria-activedescendant={results.length ? optionId(active) : undefined}
            aria-autocomplete="list"
            autoFocus
            autoComplete="off"
            spellCheck={false}
          />
          <button type="button" onClick={close} className="rounded-sm p-1 text-ink-3 hover:text-ink" aria-label="Close search">
            <X className="size-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto overscroll-contain">
          {status === 'idle' ? (
            <div className="px-4 py-5">
              <p className="meta mb-2">Try</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => setQuery(s)} className="rounded-xs border border-rule px-2 py-1 font-mono text-xs hover:border-ink">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {status === 'error' ? <p className="px-4 py-5 text-sm text-negative">Search is unavailable right now. Try again in a moment.</p> : null}
          {status === 'done' && results.length === 0 ? (
            <p className="px-4 py-5 text-sm text-ink-2">
              No matches for “{query.trim()}”. Try a technology name, a topic such as “robotics”, or a broader term.
            </p>
          ) : null}
          <ul id={listId} role="listbox" aria-label="Results" className={results.length ? 'py-2' : 'hidden'}>
            {results.map((r, i) => (
              <li
                key={`${r.type}-${r.href}-${i}`}
                id={optionId(i)}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(r.href)}
                className={`mx-2 grid cursor-pointer grid-cols-[6.5rem_1fr_auto] items-start gap-3 rounded-sm px-2 py-2 ${i === active ? 'bg-paper-sunken' : ''}`}
              >
                <span className="meta pt-0.5 text-[10px]">{TYPE_LABEL[r.type] ?? r.type}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{r.title}</span>
                  <span className="block truncate text-xs text-ink-3">{r.meta.join(' · ')}</span>
                </span>
                {typeof r.score === 'number' ? (
                  <span className="numeric text-sm text-ink-2">{r.score}</span>
                ) : (
                  <ArrowRight aria-hidden className="mt-0.5 size-3.5 text-ink-3" />
                )}
              </li>
            ))}
          </ul>
        </div>
        <div className="meta flex items-center justify-between border-t border-rule px-4 py-2 text-[10px]">
          <span>↑↓ to move · Enter to open · Esc to close</span>
          <span aria-live="polite">{status === 'loading' ? 'Searching…' : status === 'done' ? `${results.length} results` : ''}</span>
        </div>
      </dialog>
    </>
  )
}
