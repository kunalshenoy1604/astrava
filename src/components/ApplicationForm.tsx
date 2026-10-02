'use client'

import { useActionState } from 'react'
import { submitApplicationAction, type FormState } from '@/lib/reviewers/actions'

interface Option {
  value: string
  label: string
}

function Field({ name, label, help, error, children }: { name: string; label: string; help?: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={name} className="label">
        {label}
      </label>
      {children}
      {help ? <p className="mt-1 text-xs text-ink-3">{help}</p> : null}
      {error ? (
        <p id={`${name}-error`} className="mt-1 text-xs text-negative">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function ApplicationForm({ topics, signals, defaultName }: { topics: Option[]; signals: Option[]; defaultName: string }) {
  const [state, action, pending] = useActionState<FormState | null, FormData>(submitApplicationAction, null)
  const e = state?.fieldErrors ?? {}
  if (state?.ok) {
    return (
      <div role="status" className="rounded-sm border border-positive/50 bg-paper-raised p-6">
        <p className="meta text-positive">Submitted</p>
        <p className="mt-2 text-lg">{state.message}</p>
      </div>
    )
  }
  const area = 'field h-auto py-2 leading-relaxed'
  return (
    <form action={action} className="grid gap-8" noValidate>
      <fieldset className="grid gap-5">
        <legend className="mb-2 font-serif text-2xl">1 · Who you are</legend>
        <Field name="fullName" label="Full name" error={e.fullName}>
          <input id="fullName" name="fullName" autoComplete="name" defaultValue={defaultName} maxLength={120} className="field" aria-invalid={Boolean(e.fullName)} />
        </Field>
        <Field name="profileLinks" label="Public profiles (1–3)" help="LinkedIn, GitHub, personal site or publications — so your expertise can be checked." error={e.profileLinks}>
          <div className="grid gap-2">
            {[0, 1, 2].map((i) => (
              <input key={i} id={i === 0 ? 'profileLinks' : undefined} name="profileLink" type="url" inputMode="url" autoComplete="url" spellCheck={false} placeholder="https://linkedin.com/in/…" className="field" aria-label={`Profile link ${i + 1}`} />
            ))}
          </div>
        </Field>
        <fieldset>
          <legend className="label">Areas you can review (1–5)</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {topics.map((t) => (
              <label key={t.value} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="expertise" value={t.value} className="size-4 accent-[var(--a-accent)]" /> {t.label}
              </label>
            ))}
          </div>
          {e.expertise ? <p className="mt-1 text-xs text-negative">{e.expertise}</p> : null}
        </fieldset>
      </fieldset>

      <fieldset className="grid gap-5">
        <legend className="mb-2 font-serif text-2xl">2 · Your case</legend>
        <Field name="motivation" label="Why do you want to review? (200–4000 characters)" help="What would you protect or improve? How do you decide what counts as evidence?" error={e.motivation}>
          <textarea id="motivation" name="motivation" autoComplete="off" rows={6} maxLength={4000} className={area} aria-invalid={Boolean(e.motivation)} />
        </Field>
        <Field name="experience" label="Relevant experience (150–4000 characters)" help="Work, research, open-source or editorial experience in the areas you selected. Be specific." error={e.experience}>
          <textarea id="experience" name="experience" autoComplete="off" rows={6} maxLength={4000} className={area} aria-invalid={Boolean(e.experience)} />
        </Field>
      </fieldset>

      <fieldset className="grid gap-5">
        <legend className="mb-2 font-serif text-2xl">3 · Show your judgement</legend>
        <Field name="sampleSignalSlug" label="Pick a current signal" error={e.sampleSignalSlug}>
          <select id="sampleSignalSlug" name="sampleSignalSlug" className="field" defaultValue="">
            <option value="" disabled>
              Choose a signal…
            </option>
            {signals.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <Field
          name="sampleReview"
          label="Review it (200–4000 characters)"
          help="Which statements are well supported by the linked sources? What is missing or overstated? Should it stay public, and why?"
          error={e.sampleReview}
        >
          <textarea id="sampleReview" name="sampleReview" autoComplete="off" rows={8} maxLength={4000} className={area} aria-invalid={Boolean(e.sampleReview)} />
        </Field>
      </fieldset>

      <fieldset className="grid gap-5">
        <legend className="mb-2 font-serif text-2xl">4 · Commitments</legend>
        <Field name="conflicts" label="Conflicts of interest" help="Employers, investments or projects you maintain that you would need to recuse yourself from. Write “None” if none." error={e.conflicts}>
          <textarea id="conflicts" name="conflicts" autoComplete="off" rows={3} maxLength={2000} className={area} />
        </Field>
        <Field name="hoursPerWeek" label="Hours per week you can give" error={e.hoursPerWeek}>
          <input id="hoursPerWeek" name="hoursPerWeek" type="number" min={1} max={40} defaultValue={2} className="field w-28" />
        </Field>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="agreed" className="mt-0.5 size-4 accent-[var(--a-accent)]" />
          <span>
            I will follow the reviewer guidelines: act only on evidence, write a public reason for every action, recuse myself from conflicts, and
            never hide a signal to favour or harm a project I am connected to.
          </span>
        </label>
        {e.agreed ? <p className="text-xs text-negative">{e.agreed}</p> : null}
      </fieldset>

      <div className="flex flex-wrap items-center gap-4 border-t border-rule pt-6">
        <button type="submit" disabled={pending} className="btn-primary h-11 px-6">
          {pending ? 'Submitting…' : 'Submit application'}
        </button>
        {state && !state.ok ? (
          <p role="alert" className="text-sm text-negative">
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  )
}
