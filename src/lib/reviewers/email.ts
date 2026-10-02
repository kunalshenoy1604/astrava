import 'server-only'
import { absoluteUrl } from '@/lib/config'
import { TOPIC_BY_SLUG } from '@/lib/demo/topics'
import type { ApplicationInput } from './schema'
import { signDecisionToken } from './token'

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** Structured application email to the owner, with a signed link to the decision page. */
export async function sendApplicationEmail(app: ApplicationInput & { id: string; email: string; signalTitle: string }): Promise<{ sent: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.ADMIN_NOTIFICATION_EMAIL
  if (!apiKey || !to) return { sent: false, error: 'RESEND_API_KEY or ADMIN_NOTIFICATION_EMAIL not configured' }

  const decisionUrl = absoluteUrl(`/reviewers/decision?token=${encodeURIComponent(signDecisionToken(app.id))}`)
  const rows: [string, string][] = [
    ['Applicant', `${app.fullName} <${app.email}>`],
    ['Application ID', app.id],
    ['Profiles', app.profileLinks.join('\n')],
    ['Areas of expertise', app.expertise.map((t) => TOPIC_BY_SLUG.get(t)?.name ?? t).join(', ')],
    ['Time commitment', `${app.hoursPerWeek} hour(s) per week`],
    ['1. Why they want to review', app.motivation],
    ['2. Relevant experience', app.experience],
    [`3. Sample review — “${app.signalTitle}”`, app.sampleReview],
    ['4. Conflicts of interest', app.conflicts],
    ['Guidelines', 'Agreed'],
  ]
  const html = `<!doctype html><html><body style="font-family:Georgia,serif;color:#17150f;background:#f3f0e8;padding:24px">
<div style="max-width:680px;margin:auto;background:#faf8f3;border:1px solid #d6d0c1;padding:24px">
<p style="font:11px monospace;letter-spacing:.08em;text-transform:uppercase;color:#625d53;margin:0">Astrava · Reviewer application</p>
<h1 style="font-weight:500;margin:8px 0 16px">${esc(app.fullName)} wants reviewer access</h1>
<table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">
${rows.map(([k, v]) => `<tr><th style="text-align:left;vertical-align:top;padding:10px 12px 10px 0;border-top:1px solid #d6d0c1;width:190px;color:#3f3b33">${esc(k)}</th><td style="padding:10px 0;border-top:1px solid #d6d0c1;white-space:pre-wrap">${esc(v)}</td></tr>`).join('')}
</table>
<p style="margin:24px 0 8px"><a href="${esc(decisionUrl)}" style="background:#17150f;color:#f3f0e8;padding:12px 18px;text-decoration:none;font-family:Arial,sans-serif">Review and decide →</a></p>
<p style="font:12px Arial,sans-serif;color:#625d53">The link opens a confirmation page where you approve or reject. It expires in 14 days. Access is granted only after you confirm.</p>
</div></body></html>`
  const text = `${rows.map(([k, v]) => `${k}:\n${v}`).join('\n\n')}\n\nReview and decide: ${decisionUrl}`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM ?? 'Astrava <onboarding@resend.dev>',
        to: [to],
        reply_to: app.email,
        subject: `Reviewer application: ${app.fullName} (${app.expertise.length} area${app.expertise.length === 1 ? '' : 's'})`,
        html,
        text,
      }),
      cache: 'no-store',
    })
    return res.ok ? { sent: true } : { sent: false, error: `Resend ${res.status}: ${(await res.text()).slice(0, 200)}` }
  } catch (err) {
    return { sent: false, error: (err as Error).message }
  }
}
