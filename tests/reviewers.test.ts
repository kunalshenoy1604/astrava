import { beforeAll, describe, expect, it } from 'vitest'
import { signDecisionToken, verifyDecisionToken } from '@/lib/reviewers/token'
import { applicationSchema } from '@/lib/reviewers/schema'

beforeAll(() => {
  process.env.REVIEW_TOKEN_SECRET = 'test-secret-that-is-long-enough'
})

describe('decision tokens', () => {
  it('round-trips and rejects tampering or expiry', () => {
    const id = '11111111-2222-3333-4444-555555555555'
    const t = signDecisionToken(id, 0)
    expect(verifyDecisionToken(t, 1000)).toEqual({ applicationId: id })
    expect(verifyDecisionToken(t, 15 * 24 * 3600 * 1000)).toBeNull()
    const [p, s] = t.split('.')
    const forged = Buffer.from(JSON.stringify({ a: 'someone-else', e: 9e15 })).toString('base64url')
    expect(verifyDecisionToken(`${forged}.${s}`, 1000)).toBeNull()
    expect(verifyDecisionToken(`${p}.${s}x`, 1000)).toBeNull()
    expect(verifyDecisionToken('garbage', 1000)).toBeNull()
  })
})

describe('application schema', () => {
  const valid = {
    fullName: 'Ada Lovelace',
    profileLinks: ['https://github.com/ada', ''],
    expertise: ['ai-agents'],
    motivation: 'm'.repeat(200),
    experience: 'e'.repeat(150),
    sampleSignalSlug: 'github-acme-specagent',
    sampleReview: 's'.repeat(200),
    conflicts: 'None',
    hoursPerWeek: '3',
    agreed: true,
  }
  it('accepts a complete case', () => {
    const r = applicationSchema.safeParse(valid)
    expect(r.success).toBe(true)
    expect(r.data?.profileLinks).toEqual(['https://github.com/ada'])
  })
  it('rejects thin or unsafe answers', () => {
    expect(applicationSchema.safeParse({ ...valid, motivation: 'I like tech' }).success).toBe(false)
    expect(applicationSchema.safeParse({ ...valid, profileLinks: ['javascript:alert(1)'] }).success).toBe(false)
    expect(applicationSchema.safeParse({ ...valid, expertise: ['not-a-topic'] }).success).toBe(false)
    expect(applicationSchema.safeParse({ ...valid, agreed: false }).success).toBe(false)
  })
})
