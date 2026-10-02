/**
 * Runs the real Supabase migration against an in-process Postgres (PGlite)
 * with a minimal stand-in for Supabase's auth schema and roles, then checks
 * row-level security and search behave as intended.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'
import { DEMO_SIGNALS, TOPICS } from '@/lib/demo'
import { signalToRows } from '@/lib/data/mapping'
import { computeBreakoutScore } from '@/lib/scoring/model'

const SUPABASE_STUB = `
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create schema extensions;
  grant usage on schema public, extensions, auth to anon, authenticated, service_role;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant usage, select on sequences to anon, authenticated, service_role;
`

const ADMIN = '00000000-0000-0000-0000-00000000000a'
const ALICE = '00000000-0000-0000-0000-0000000000a1'
const BOB = '00000000-0000-0000-0000-0000000000b0'

let db: PGlite

async function as(role: 'anon' | 'authenticated', sub: string | null, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${sub ?? ''}', false); set role ${role};`)
  try {
    return await db.query(sql, params)
  } finally {
    await db.exec('reset role;')
  }
}

beforeAll(async () => {
  db = new PGlite({ extensions: { pg_trgm } })
  await db.exec(SUPABASE_STUB)
  for (const f of readdirSync('supabase/migrations').sort()) await db.exec(readFileSync(`supabase/migrations/${f}`, 'utf8'))

  for (const t of [...TOPICS].sort((a, b) => Number(Boolean(a.parent)) - Number(Boolean(b.parent))))
    await db.query('insert into topics (slug, name, short_name, description, parent_slug) values ($1,$2,$3,$4,$5)', [t.slug, t.name, t.short, t.description, t.parent ?? null])

  for (const s of DEMO_SIGNALS) {
    const { signalRow: r, sourceRows, entityRows, signalEntityRows, scoreRow } = signalToRows(s, computeBreakoutScore(s))
    await db.query(
      `insert into signals (id, slug, title, dek, primary_topic, topics, status, time_to_impact, first_seen_at, updated_at, is_verified, is_hidden, is_demo, content, score_total, score_band, confidence_level, momentum_ratio, developer_impact, source_count, independent_count, sparkline)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)`,
      [r.id, r.slug, r.title, r.dek, r.primary_topic, r.topics, r.status, r.time_to_impact, r.first_seen_at, r.updated_at, r.is_verified, r.is_hidden, r.is_demo, JSON.stringify(r.content), r.score_total, r.score_band, r.confidence_level, r.momentum_ratio, r.developer_impact, r.source_count, r.independent_count, r.sparkline],
    )
    for (const x of sourceRows)
      await db.query('insert into signal_sources (signal_id, local_id, kind, tier, title, publisher, url, published_at, retrieved_at, independent, is_placeholder, note) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)', [x.signal_id, x.local_id, x.kind, x.tier, x.title, x.publisher, x.url, x.published_at, x.retrieved_at, x.independent, x.is_placeholder, x.note])
    for (const e of entityRows) await db.query('insert into entities (slug, name, kind) values ($1,$2,$3) on conflict do nothing', [e.slug, e.name, e.kind])
    for (const e of signalEntityRows) await db.query('insert into signal_entities values ($1,$2)', [e.signal_id, e.entity_slug])
    await db.query('insert into signal_scores (signal_id, model_version, total, breakdown) values ($1,$2,$3,$4)', [scoreRow.signal_id, scoreRow.model_version, scoreRow.total, JSON.stringify(scoreRow.breakdown)])
  }
  for (const [id, email] of [[ADMIN, 'admin@example.com'], [ALICE, 'alice@example.com'], [BOB, 'bob@example.com']])
    await db.query('insert into auth.users (id, email) values ($1, $2)', [id, email])
  await db.query(`update profiles set role = 'admin' where id = $1`, [ADMIN])
  await db.query('update signals set is_hidden = true where slug = $1', [DEMO_SIGNALS[1]!.slug])
}, 60_000)

describe('schema and row-level security', () => {
  it('creates a profile for each new auth user', async () => {
    const r = await db.query<{ n: number }>('select count(*)::int as n from profiles')
    expect(r.rows[0]!.n).toBe(3)
  })

  it('lets anon read visible signals only', async () => {
    const r = await as('anon', null, 'select slug from signals')
    expect(r.rows.length).toBe(DEMO_SIGNALS.length - 1)
    const hidden = await as('anon', null, 'select count(*)::int as n from signal_sources where signal_id = $1', [DEMO_SIGNALS[1]!.id])
    expect((hidden.rows[0] as { n: number }).n).toBe(0)
  })

  it('lets admins see hidden signals and edit them; members cannot', async () => {
    const adminSees = await as('authenticated', ADMIN, 'select count(*)::int as n from signals')
    expect((adminSees.rows[0] as { n: number }).n).toBe(DEMO_SIGNALS.length)
    await as('authenticated', ALICE, `update signals set title = 'Tampered title here' where slug = $1`, [DEMO_SIGNALS[0]!.slug])
    const t = await db.query<{ title: string }>('select title from signals where slug = $1', [DEMO_SIGNALS[0]!.slug])
    expect(t.rows[0]!.title).toBe(DEMO_SIGNALS[0]!.title)
    await as('authenticated', ADMIN, `update signals set is_verified = false where slug = $1`, [DEMO_SIGNALS[0]!.slug])
    const v = await db.query<{ is_verified: boolean }>('select is_verified from signals where slug = $1', [DEMO_SIGNALS[0]!.slug])
    expect(v.rows[0]!.is_verified).toBe(false)
  })

  it('prevents users from promoting themselves to admin', async () => {
    await expect(as('authenticated', ALICE, `update profiles set role = 'admin' where id = $1`, [ALICE])).rejects.toThrow(/permission denied/)
    await as('authenticated', ALICE, `update profiles set display_name = 'Alice' where id = $1`, [ALICE])
    const p = await db.query<{ display_name: string; role: string }>('select display_name, role from profiles where id = $1', [ALICE])
    expect(p.rows[0]).toEqual({ display_name: 'Alice', role: 'member' })
  })

  it('isolates saved signals and radar topics per user', async () => {
    await as('authenticated', ALICE, 'insert into saved_signals (user_id, signal_slug) values ($1, $2)', [ALICE, DEMO_SIGNALS[0]!.slug])
    await as('authenticated', ALICE, 'insert into user_topics (user_id, topic_slug) values ($1, $2)', [ALICE, 'robotics'])
    const bobSees = await as('authenticated', BOB, 'select * from saved_signals')
    expect(bobSees.rows).toHaveLength(0)
    await expect(as('authenticated', BOB, 'insert into saved_signals (user_id, signal_slug) values ($1, $2)', [ALICE, DEMO_SIGNALS[2]!.slug])).rejects.toThrow(/row-level security/)
    expect((await as('anon', null, 'select * from user_topics')).rows).toHaveLength(0)
  })

  it('keeps pipeline tables private', async () => {
    expect((await as('anon', null, 'select * from raw_events')).rows).toHaveLength(0)
    await expect(as('anon', null, `insert into raw_events (source, external_id, dedupe_key, payload, normalized) values ('x','1','x:1','{}','{}')`)).rejects.toThrow()
  })

  it('rejects non-http source URLs', async () => {
    await expect(
      db.query(`insert into signal_sources (signal_id, local_id, kind, tier, title, publisher, url) values ($1, 'zz', 'news', 'secondary', 't', 'p', 'javascript:alert(1)')`, [DEMO_SIGNALS[0]!.id]),
    ).rejects.toThrow(/check constraint/)
  })

  it('searches across signals, entities and topics, respecting visibility', async () => {
    const r = await as('anon', null, `select result_type, title, href from search_all('sandbox')`)
    const rows = r.rows as { result_type: string; href: string }[]
    expect(rows.some((x) => x.result_type === 'signal' && x.href.includes('cinder'))).toBe(true)
    const topics = (await as('anon', null, `select result_type from search_all('robotics')`)).rows as { result_type: string }[]
    expect(topics.some((x) => x.result_type === 'topic')).toBe(true)
    const hidden = (await as('anon', null, `select href from search_all('Tracefile')`)).rows as { href: string }[]
    expect(hidden.some((x) => x.href.includes(DEMO_SIGNALS[1]!.slug))).toBe(false)
  })

  it('lets only reviewers moderate, with a reason, and logs publicly', async () => {
    const slug = DEMO_SIGNALS[3]!.slug
    await expect(as('authenticated', ALICE, `select moderate_signal($1, 't', 'hide', 'Sources do not support the headline claim.')`, [slug])).rejects.toThrow(/Only reviewers/)
    await expect(as('anon', null, `select moderate_signal($1, 't', 'hide', 'Sources do not support the headline claim.')`, [slug])).rejects.toThrow()
    await db.query(`update profiles set role = 'reviewer', display_name = 'Rev' where id = $1`, [BOB])
    await expect(as('authenticated', BOB, `select moderate_signal($1, 't', 'hide', 'too short')`, [slug])).rejects.toThrow(/at least 20/)
    await as('authenticated', BOB, `select moderate_signal($1, 'Title', 'hide', 'Sources do not support the headline claim.')`, [slug])
    const state = await as('anon', null, 'select hidden from signal_moderation where signal_slug = $1', [slug])
    expect((state.rows[0] as { hidden: boolean }).hidden).toBe(true)
    const log = await as('anon', null, 'select action, actor_name from moderation_log where signal_slug = $1', [slug])
    expect(log.rows).toEqual([{ action: 'hide', actor_name: 'Rev' }])
    await expect(as('authenticated', BOB, `insert into moderation_log (signal_slug, action, reason) values ('x-y-z', 'hide', 'direct write attempt here')`)).rejects.toThrow()
  })

  it('accepts one pending reviewer application per user, visible to its owner and admins only', async () => {
    const app = (uid: string) =>
      as(
        'authenticated',
        uid,
        `insert into reviewer_applications (user_id, email, full_name, expertise, motivation, experience, sample_review, conflicts, hours_per_week, agreed_guidelines)
         values ($1, 'a@example.com', 'Alice Example', array['ai-agents'], repeat('m', 220), repeat('e', 160), repeat('s', 220), 'None', 3, true)`,
        [uid],
      )
    await app(ALICE)
    await expect(app(ALICE)).rejects.toThrow(/duplicate key/)
    await expect(as('authenticated', BOB, `insert into reviewer_applications (user_id, email, full_name, expertise, motivation, experience, sample_review, conflicts, hours_per_week, agreed_guidelines, status) values ($1, 'b@example.com', 'Bob', array['robotics'], repeat('m', 220), repeat('e', 160), repeat('s', 220), 'None', 3, true, 'approved')`, [BOB])).rejects.toThrow(/row-level security/)
    expect((await as('authenticated', BOB, 'select * from reviewer_applications')).rows).toHaveLength(0)
    expect((await as('authenticated', ALICE, 'select * from reviewer_applications')).rows).toHaveLength(1)
    expect((await as('authenticated', ADMIN, 'select * from reviewer_applications')).rows).toHaveLength(1)
    await as('authenticated', ALICE, `update reviewer_applications set status = 'approved'`)
    const st = await db.query<{ status: string }>('select status from reviewer_applications')
    expect(st.rows[0]!.status).toBe('pending')
  })

  it('keeps the AI cache private', async () => {
    expect((await as('anon', null, 'select * from ai_enrichments')).rows).toHaveLength(0)
    await expect(as('authenticated', ALICE, `insert into ai_enrichments (cache_key, model, result) values ('k', 'm', '{}')`)).rejects.toThrow()
  })
})
