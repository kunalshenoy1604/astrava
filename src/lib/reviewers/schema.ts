import { z } from 'zod'
import { TOPIC_BY_SLUG } from '@/lib/demo/topics'
import { isSafeHttpUrl } from '@/lib/security/url'

/** The structured case an applicant must make. Minimums force a real argument, not a one-liner. */
export const applicationSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name.').max(120),
  profileLinks: z
    .array(z.string().trim())
    .transform((l) => l.filter(Boolean))
    .pipe(z.array(z.string().refine(isSafeHttpUrl, 'Links must be full http(s) URLs.')).min(1, 'Add at least one public profile (LinkedIn, GitHub, website).').max(3)),
  expertise: z.array(z.string().refine((t) => TOPIC_BY_SLUG.has(t))).min(1, 'Pick at least one area.').max(5, 'Pick at most five areas.'),
  motivation: z.string().trim().min(200, 'Motivation: at least 200 characters.').max(4000),
  experience: z.string().trim().min(150, 'Experience: at least 150 characters.').max(4000),
  sampleSignalSlug: z.string().regex(/^[a-z0-9-]{3,120}$/, 'Choose a signal to review.'),
  sampleReview: z.string().trim().min(200, 'Sample review: at least 200 characters.').max(4000),
  conflicts: z.string().trim().min(2, 'Declare conflicts of interest, or write “None”.').max(2000),
  hoursPerWeek: z.coerce.number().int().min(1, 'At least 1 hour a week.').max(40),
  agreed: z.literal(true, { message: 'You must agree to the reviewer guidelines.' }),
})
export type ApplicationInput = z.infer<typeof applicationSchema>

export function parseApplication(formData: FormData) {
  return applicationSchema.safeParse({
    fullName: formData.get('fullName'),
    profileLinks: formData.getAll('profileLink').map(String),
    expertise: formData.getAll('expertise').map(String),
    motivation: formData.get('motivation'),
    experience: formData.get('experience'),
    sampleSignalSlug: formData.get('sampleSignalSlug'),
    sampleReview: formData.get('sampleReview'),
    conflicts: formData.get('conflicts'),
    hoursPerWeek: formData.get('hoursPerWeek'),
    agreed: formData.get('agreed') === 'on',
  })
}
