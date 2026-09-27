# Astrava

**The signals before the signals.** A developer intelligence platform that finds early technical developments across AI, agents, foundation models, developer tools, AI infrastructure, open source, robotics, quantum computing, cybersecurity and computing infrastructure — and ranks them by evidence, with hype penalised and every point explained.

Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS 4 · Supabase (Postgres, Auth, RLS) · deployable to Vercel.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000 — runs on the demo dataset, no setup needed
npm test             # 57 tests: scoring, data integrity, pipeline, search, schema + RLS
npm run build
```

Without Supabase the app runs **live without a database**: the ingestion pipeline runs against the public GitHub, arXiv, Hacker News, Hugging Face and npm APIs, and its output is cached for an hour, then recomputed. Everything shown is real and sourced. Without stored history, momentum is available only where a source returns a time series (npm daily downloads, Hacker News points by date); recently created repositories are ranked by their measured stars per day. If every source fails, the site falls back to a **clearly labelled demo dataset** (fictional projects, `example.org` placeholder sources) and says so in the status bar. Set `DATA_MODE=demo` to force the demo dataset. Radar and saved signals work without accounts (first-party cookie); accounts and the admin area need Supabase. Setting `GITHUB_TOKEN` raises GitHub's rate limits.

## Connect Supabase

1. Create a Supabase project. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or the legacy anon key) and `SUPABASE_SERVICE_ROLE_KEY`.
2. Apply the schema: `supabase db push`, or paste `supabase/migrations/20260927000000_init.sql` into the SQL editor.
3. Seed topics (required) and, optionally, the demo signals:
   ```bash
   npm run seed -- --topics-only   # production: topics only
   npm run seed                    # topics + demo signals (kept flagged is_demo = true)
   ```
4. Auth → URL configuration: add `https://your-domain/auth/callback` and `https://your-domain/auth/confirm` as redirect URLs. For Google, enable the provider in Supabase and set `NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=true`.
5. Make yourself an admin after signing up:
   ```sql
   update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');
   ```

## Deploy to Vercel

Import the repository, add the environment variables from `.env.example`, deploy. `vercel.json` schedules `/api/cron/ingest` once a day, which the Hobby plan allows. For the hourly cadence, either change the schedule to `7 * * * *` on Vercel Pro, or enable `.github/workflows/pipeline.yml` (add a `CRON_SECRET` repository secret and a `SITE_URL` variable). Vercel sends `Authorization: Bearer $CRON_SECRET` automatically when `CRON_SECRET` is set.

---

## How it works

### Information architecture

| Route | What it is | Rendering |
|---|---|---|
| `/` | Hero, annotated live example, ranked feed, radar teaser, movers, score explainer, field guide | Static shell + streamed personal parts |
| `/signals` | Full feed; filter by topic/status, sort by score/momentum/recency (plain links, no JS needed) | Partial prerender |
| `/signals/[slug]` | Signal intelligence page (see below) | Prerendered per slug, revalidated by tag |
| `/topics`, `/topics/[slug]` | Topic hubs: current + historical signals, areas tracked, FAQs, related topics | Prerendered |
| `/radar` | Topic picker, radar stats, filtered feed, saved signals | Per-user, streamed |
| `/search` + ⌘K | Search across signals, technologies, companies, papers, projects, topics | `/api/search` (rate-limited) |
| `/methodology`, `/about` | Every weight and threshold, imported from the scoring code | Static |
| `/sign-in`, `/sign-up`, `/account` | Supabase Auth (email/password, optional Google) | Dynamic |
| `/admin`, `/admin/signals/[id]` | Edit metadata, category, status, rubric levels; hide/verify; inspect evidence and scoring | Admin-only (404 otherwise) |

Signal pages follow a fixed, extractable structure — **What happened · Why it matters · Should I care? · Technical change (with architecture diagram) · Developer impact (with difficulty estimate) · Adoption & momentum · Limitations & risks · Competing approaches · Who is building on it · Evidence & sources · How the score was calculated · Related signals** — all in the server-rendered HTML, none hidden behind tabs.

### Anti-fabrication rules (enforced in code)

- Every statement is typed `fact`, `analysis` or `estimate`, and rendered with a visible tag. `validateSignal()` rejects any `fact` without a source that exists on the same signal; the pipeline refuses to store invalid signals, and the test suite checks the whole demo dataset.
- Missing data renders **“Insufficient evidence”** (unknown maintainers, no benchmark, no history for momentum, no architecture) — never a plausible filler.
- The automated pipeline only restates fields returned by source APIs as facts. Architecture, difficulty, readiness and technical significance are left empty until an analyst fills them in.
- Demo data is fictional by design: sources are `example.org` placeholders (flagged `isPlaceholder`), series are `provenance: 'demo'`, demo signal pages are `noindex` and excluded from the sitemap, and placeholder URLs are never emitted as JSON-LD citations.

### Breakout Score (model `breakout-v1.2`)

`src/lib/scoring/model.ts` — a deterministic function; the same code runs in the pipeline, the admin area and the demo.

| Factor | Max | Basis |
|---|---|---|
| Novelty, Technical significance, Developer relevance | 15 each | Analyst rubric 0–4 |
| Adoption velocity | 10 | Independent integrations + growth of an adoption series |
| Community momentum | 10 | latest window ÷ mean of previous 4, log-scaled, low-volume dampened |
| Source credibility | 10 | Primary source present + mean tier weight |
| Cross-source confirmation | 10 | Independent publishers (community counts ½) |
| Evidence strength | 10 | Primary source, runnable artifact, reproducible benchmark, docs/paper |
| Time to impact | 5 | Estimate band |
| **Hype penalty** | −15 | Superlatives in headlines, self-reported-only benchmarks, attention outpacing evidence, analyst flags |

Confidence is computed separately (coverage, independent confirmation, primary sources, evidence, hype) and is capped at *Low* when no independent, non-community source exists.

### Ingestion pipeline

```
Source adapter → Normalized event → Deduplication → Entity resolution → Momentum
→ Candidate threshold → Structured explanation → Breakout Score → Storage → revalidateTag('signals')
```

- Adapters (`src/lib/pipeline/sources/`): **GitHub** REST search, **arXiv** API, **Hacker News** (Algolia API), **Hugging Face** Hub API, **npm** registry search + downloads API, **official RSS/Atom feeds** you configure. All official APIs or syndication feeds — no scraping. Add a source by implementing `SourceAdapter` and registering it in `sources/index.ts`.
- Each source is isolated: one failure marks the run `partial` and the rest continue. Runs are logged in `pipeline_runs`.
- Deduplication by source key and canonical URL; entity resolution by union-find over `github:`, `npm:`, `hf:`, `arxiv:` references (an HN thread, an npm package and a paper pointing at the same repo become one signal).
- Momentum uses rolling 7-day windows; cumulative counters are differenced, and windows without prior observations are omitted, not estimated.
- Analyst edits survive re-runs: verified signals keep their editorial text, and human rubric levels are never overwritten by heuristics.

Run it: `npm run pipeline:dry` (in-memory, prints results), `npm run pipeline` (writes to Supabase), or `GET /api/cron/ingest` with the bearer secret.

### Caching and performance

`cacheComponents` is on. Public data is read through `'use cache'` functions (`src/lib/data/queries.ts`, tag `signals`, `cacheLife('hours')`), so pages prerender into static shells. Per-user UI (account slot, save buttons, radar) reads cookies behind `<Suspense>`; the saved/radar state is passed to client components as an un-awaited promise, so the public content never waits for it. Pipeline runs and admin edits invalidate the tag. Client JavaScript is limited to search, theme, save and radar controls; charts, diagrams and the score breakdown are server-rendered SVG/HTML (`<details>` for “Why 91?”). Fonts are self-hosted.

### Security

- RLS on every table (verified by `tests/schema.test.ts` against real Postgres via PGlite): anon reads visible signals only; users read/write only their own topics and saves; users can edit only `display_name` (column grants — no self-promotion to admin); admins edit editorial columns only; pipeline tables have no client access.
- Service-role key is read only in `server-only` modules (`src/lib/supabase/service.ts`, the cron route and scripts).
- `getUser()` (server-verified) for authorisation; the proxy only refreshes sessions and does optimistic redirects.
- zod validation on every action; same-site redirect validation; http(s)-only URL validation in code *and* a DB check constraint; timing-safe cron secret comparison; per-IP rate limits on search, auth, personal and admin actions (in-memory — swap `hit()` for Redis for global limits); JSON-LD escaped; no user HTML is ever rendered.

### Design system

Tokens live in `src/app/globals.css`: colour (separately tuned light “publication” and dark “research terminal” palettes, all text pairs ≥ 4.5:1), type scale (Newsreader for editorial headlines, IBM Plex Sans for UI, IBM Plex Mono for data), spacing (4 px base), radius (2–6 px), overlay-only shadow, motion tokens with `prefers-reduced-motion` support, and breakpoints. Reusable components in `src/components/` include `SignalCard`, `SignalScore`, `ScoreBreakdown`, `SignalTimeline`, `EvidenceList`, `SourceBadge`, `TechnicalDifficulty`, `ArchitectureDiagram`, `MomentumChart`, `TopicBadge`, `RadarSelector`, `SearchCommand`, `SignalFeed`, `MethodologyExplainer`, `RelatedSignals`, `SaveSignalButton`, `EmptyState`, `LoadingState`, `ErrorState`.

## Project layout

```
src/app/                 routes, metadata, sitemap, robots, OG image
src/components/          UI components (server by default; 'use client' only where interactive)
src/lib/domain/          types, labels, validation, summaries
src/lib/scoring/         Breakout Score model and hype penalty
src/lib/data/            repository interface, demo + Supabase implementations, cached queries
src/lib/pipeline/        adapters, stages, extraction, store, orchestration
src/lib/personal/        radar + saved signals (account or cookie) and server actions
src/lib/auth, admin, security, supabase
src/lib/demo/            topic taxonomy and the fictional demo dataset
supabase/migrations/     schema, RLS, search function
scripts/                 seed and pipeline CLIs
tests/                   vitest suites
```

## Known limitations

- The in-memory rate limiter is per instance.
- Automatically detected signals start with conservative heuristic rubric levels and “technical significance: not assessed”, so they rank below reviewed signals until an admin reviews them. This is intentional.
- New entities have no history, so momentum reads “insufficient evidence” for their first weeks.
