'use client'

import { useActionState } from 'react'
import { updateSignalAction, type AdminActionState } from '@/lib/admin/actions'
import type { Signal, Topic } from '@/lib/domain/types'
import { STATUS_LABEL, TIME_TO_IMPACT_LABEL } from '@/lib/domain/labels'
import { RUBRIC_LABELS } from '@/lib/scoring/model'

const LEVELS = ['', '0', '1', '2', '3', '4'] as const

export function AdminSignalForm({ signal, topics }: { signal: Signal; topics: Topic[] }) {
  const [state, action, pending] = useActionState<AdminActionState | null, FormData>(updateSignalAction, null)
  const a = signal.scoreInputs.assessed
  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="id" value={signal.id} />
      <div>
        <label htmlFor="title" className="label">Title</label>
        <input id="title" name="title" defaultValue={signal.title} required minLength={8} maxLength={180} className="field" />
      </div>
      <div>
        <label htmlFor="dek" className="label">Why we’re watching (dek)</label>
        <textarea id="dek" name="dek" defaultValue={signal.dek} required minLength={8} maxLength={320} rows={3} className="field h-auto py-2" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="primaryTopic" className="label">Category</label>
          <select id="primaryTopic" name="primaryTopic" defaultValue={signal.primaryTopic} className="field">
            {topics.map((t) => (
              <option key={t.slug} value={t.slug}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="status" className="label">Status</label>
          <select id="status" name="status" defaultValue={signal.status} className="field">
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="timeToImpact" className="label">Time to impact</label>
          <select id="timeToImpact" name="timeToImpact" defaultValue={signal.timeToImpact} className="field">
            {Object.entries(TIME_TO_IMPACT_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>
      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="meta mb-2 text-ink">Analyst rubric (0–4, blank = not assessed)</legend>
        {(
          [
            ['novelty', 'Novelty', a.novelty.level],
            ['technicalSignificance', 'Technical significance', a.technicalSignificance.level],
            ['developerRelevance', 'Developer relevance', a.developerRelevance.level],
          ] as const
        ).map(([name, label, level]) => (
          <div key={name}>
            <label htmlFor={name} className="label">{label}</label>
            <select id={name} name={name} defaultValue={level === null ? '' : String(level)} className="field">
              {LEVELS.map((l) => (
                <option key={l} value={l}>{l === '' ? 'Not assessed' : `${l} — ${RUBRIC_LABELS[Number(l) as 0 | 1 | 2 | 3 | 4]}`}</option>
              ))}
            </select>
          </div>
        ))}
      </fieldset>
      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="verified" defaultChecked={signal.verified} className="size-4 accent-[var(--a-accent)]" /> Mark as verified
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="hidden" defaultChecked={signal.hidden} className="size-4 accent-[var(--a-accent)]" /> Hide from public site
        </label>
      </div>
      <div className="flex items-center gap-4">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? 'Saving…' : 'Save and rescore'}
        </button>
        <p role="status" aria-live="polite" className={`text-sm ${state && !state.ok ? 'text-negative' : 'text-positive'}`}>
          {state?.message}
        </p>
      </div>
    </form>
  )
}
