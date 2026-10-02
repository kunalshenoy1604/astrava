'use server'

import { refresh, updateTag } from 'next/cache'
import { z } from 'zod'
import { getViewer, requireAdmin, requireReviewer } from '@/lib/auth/viewer'
import { createSessionClient } from '@/lib/supabase/server'
import { recordDecision } from './privileged'
import { rateLimit } from '@/lib/security/rate-limit'
import { getSignalBySlug } from '@/lib/data/queries'
import { MODERATION_TAG, SIGNALS_TAG } from '@/lib/data/tags'
import { parseApplication } from './schema'
import { sendApplicationEmail } from './email'
import { verifyDecisionToken } from './token'

export interface FormState {
  ok: boolean
  message: string
  fieldErrors?: Record<string, string>
}

/** Submits a reviewer application and emails it to the owner for a decision. */
export async function submitApplicationAction(_prev: FormState | null, formData: FormData): Promise<FormState> {
  const limited = await rateLimit('auth')
  if (!limited.allowed) return { ok: false, message: 'Too many submissions. Try again later.' }
  const viewer = await getViewer()
  if (!viewer?.email) return { ok: false, message: 'Sign in before applying.' }
  if (viewer.role !== 'member') return { ok: false, message: 'You already have reviewer access.' }

  const parsed = parseApplication(formData)
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message
    return { ok: false, message: 'Some answers need more work — see the highlighted fields.', fieldErrors }
  }
  const input = parsed.data
  const db = (await createSessionClient())!
  const { data, error } = await db
    .from('reviewer_applications')
    .insert({
      user_id: viewer.id,
      email: viewer.email,
      full_name: input.fullName,
      profile_links: input.profileLinks,
      expertise: input.expertise,
      motivation: input.motivation,
      experience: input.experience,
      sample_signal_slug: input.sampleSignalSlug,
      sample_review: input.sampleReview,
      conflicts: input.conflicts,
      hours_per_week: input.hoursPerWeek,
      agreed_guidelines: true,
    })
    .select('id')
    .single()
  if (error) {
    return error.code === '23505'
      ? { ok: false, message: 'You already have an application under review.' }
      : { ok: false, message: 'Your application could not be saved. Please try again.' }
  }
  const signal = await getSignalBySlug(input.sampleSignalSlug).catch(() => null)
  const mail = await sendApplicationEmail({ ...input, id: data.id as string, email: viewer.email, signalTitle: signal?.signal.title ?? input.sampleSignalSlug })
  if (!mail.sent) console.error('[reviewers] application saved but email not sent:', mail.error)
  refresh()
  return { ok: true, message: 'Application submitted. The site owner reviews every application personally; your status appears on your account page.' }
}

/** Approves or rejects an application. Authorised either by a signed email link or by an admin session. */
export async function decideApplicationAction(_prev: FormState | null, formData: FormData): Promise<FormState> {
  const decision = z.enum(['approved', 'rejected']).safeParse(formData.get('decision'))
  const note = z.string().trim().max(1000).safeParse(String(formData.get('note') ?? ''))
  if (!decision.success || !note.success) return { ok: false, message: 'Invalid decision.' }

  let applicationId: string | null = null
  const token = formData.get('token')
  if (typeof token === 'string' && token) applicationId = verifyDecisionToken(token)?.applicationId ?? null
  else if (await requireAdmin()) applicationId = z.string().uuid().safeParse(formData.get('applicationId')).data ?? null
  if (!applicationId) return { ok: false, message: 'This decision link is invalid or has expired.' }

  try {
    const result = await recordDecision(applicationId, decision.data, note.data || null)
    if (result === 'not-pending') return { ok: false, message: 'This application was already decided, or no longer exists.' }
  } catch (err) {
    console.error('[reviewers] decision failed', err)
    return { ok: false, message: 'The decision could not be recorded. Check the database configuration and try again.' }
  }
  refresh()
  return { ok: true, message: decision.data === 'approved' ? 'Approved. Reviewer access is active from their next page load.' : 'Rejected. The applicant will see this on their account page.' }
}

const moderationSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{3,120}$/),
  title: z.string().max(200),
  action: z.enum(['hide', 'restore']),
  reason: z.string().trim().min(20, 'Explain the decision in at least 20 characters; it is published in the moderation log.').max(1000),
})

/** Hides or restores a signal from public view. Every action is recorded in the public moderation log. */
export async function moderateSignalAction(_prev: FormState | null, formData: FormData): Promise<FormState> {
  const reviewer = await requireReviewer()
  if (!reviewer) return { ok: false, message: 'Only reviewers can moderate signals.' }
  const limited = await rateLimit('admin')
  if (!limited.allowed) return { ok: false, message: 'Too many moderation actions. Wait a minute.' }
  const parsed = moderationSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid request.' }
  const db = (await createSessionClient())!
  const { error } = await db.rpc('moderate_signal', {
    p_slug: parsed.data.slug,
    p_title: parsed.data.title,
    p_action: parsed.data.action,
    p_reason: parsed.data.reason,
  })
  if (error) return { ok: false, message: error.message }
  updateTag(MODERATION_TAG)
  updateTag(SIGNALS_TAG)
  return { ok: true, message: parsed.data.action === 'hide' ? 'Hidden from public view and logged.' : 'Restored and logged.' }
}
