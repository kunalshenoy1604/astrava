import { TOPIC_BY_SLUG } from '@/lib/demo/topics'
import type { ApplicationRow } from '@/lib/reviewers/queries'

export function ApplicationDetails({ app }: { app: ApplicationRow }) {
  const rows: [string, string][] = [
    ['Email', app.email],
    ['Profiles', app.profile_links.join('\n')],
    ['Areas', app.expertise.map((t) => TOPIC_BY_SLUG.get(t)?.name ?? t).join(', ')],
    ['Hours per week', String(app.hours_per_week)],
    ['Why they want to review', app.motivation],
    ['Experience', app.experience],
    [`Sample review (${app.sample_signal_slug ?? '—'})`, app.sample_review],
    ['Conflicts of interest', app.conflicts],
  ]
  return (
    <dl className="divide-y divide-rule border-y border-rule">
      {rows.map(([k, v]) => (
        <div key={k} className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr]">
          <dt className="meta pt-0.5">{k}</dt>
          <dd className="text-sm leading-relaxed whitespace-pre-wrap break-words">{v}</dd>
        </div>
      ))}
    </dl>
  )
}
