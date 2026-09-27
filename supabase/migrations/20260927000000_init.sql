-- Astrava schema v1
-- Run with the Supabase CLI (`supabase db push`) or paste into the SQL editor.
--
-- Security model
--   * Public (anon) can read visible signals and their evidence. Nothing else.
--   * Authenticated users can read/write only their own profile name, topics and saves.
--   * Admins (profiles.role = 'admin') can read hidden signals and edit signal metadata.
--   * The ingestion pipeline uses the service-role key on the server; it bypasses RLS
--     and is never exposed to the browser.

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Topics
-- ---------------------------------------------------------------------------
create table public.topics (
  slug        text primary key check (slug ~ '^[a-z0-9-]{2,64}$'),
  name        text not null,
  short_name  text not null,
  description text not null,
  parent_slug text references public.topics (slug),
  sort_order  int not null default 0
);

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  role         text not null default 'member' check (role in ('member', 'admin')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)), 80));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------------------------------------------------------------------------
-- Signals
-- ---------------------------------------------------------------------------
-- array_to_string is only STABLE, so generated columns need an immutable wrapper.
create or replace function public.immutable_array_join(arr text[])
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$ select array_to_string(arr, ' ') $$;

create table public.signals (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique check (slug ~ '^[a-z0-9-]{3,120}$'),
  title             text not null check (char_length(title) between 8 and 180),
  dek               text not null check (char_length(dek) between 8 and 320),
  primary_topic     text not null references public.topics (slug),
  topics            text[] not null default '{}',
  status            text not null check (status in ('early-signal','emerging','accelerating','establishing','cooling','unconfirmed')),
  time_to_impact    text not null check (time_to_impact in ('0-3m','3-6m','6-12m','12-24m','24m+','unknown')),
  first_seen_at     timestamptz not null,
  updated_at        timestamptz not null default now(),
  is_verified       boolean not null default false,
  is_hidden         boolean not null default false,
  is_demo           boolean not null default false,
  -- Structured editorial content (statements tagged fact/analysis/estimate, architecture, etc.)
  content           jsonb not null,
  -- Denormalised from the latest signal_scores row for fast feed queries
  score_total       smallint not null default 0 check (score_total between 0 and 100),
  score_band        text not null default 'weak',
  confidence_level  text not null default 'low' check (confidence_level in ('high','medium','low')),
  momentum_ratio    real,
  developer_impact  text not null default 'unknown',
  source_count      smallint not null default 0,
  independent_count smallint not null default 0,
  sparkline         real[] not null default '{}',
  search_vector     tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(dek, '')), 'B') ||
    setweight(to_tsvector('english', public.immutable_array_join(topics)), 'C')
  ) stored
);

create index signals_feed_idx on public.signals (is_hidden, score_total desc, updated_at desc);
create index signals_recent_idx on public.signals (is_hidden, updated_at desc);
create index signals_topics_idx on public.signals using gin (topics);
create index signals_search_idx on public.signals using gin (search_vector);
create index signals_title_trgm_idx on public.signals using gin (title extensions.gin_trgm_ops);

create table public.signal_sources (
  id           uuid primary key default gen_random_uuid(),
  signal_id    uuid not null references public.signals (id) on delete cascade,
  local_id     text not null,              -- id referenced by statements in signals.content
  kind         text not null check (kind in ('official','github','paper','documentation','discussion','benchmark','news')),
  tier         text not null check (tier in ('primary','secondary','community')),
  title        text not null,
  publisher    text not null,
  url          text not null check (url ~ '^https?://[^\s/$.?#].[^\s]*$'),
  published_at timestamptz,
  retrieved_at timestamptz not null default now(),
  independent  boolean not null default false,
  is_placeholder boolean not null default false,
  note         text,
  unique (signal_id, local_id)
);
create index signal_sources_signal_idx on public.signal_sources (signal_id);
create index signal_sources_title_trgm_idx on public.signal_sources using gin (title extensions.gin_trgm_ops);

create table public.signal_scores (
  id            uuid primary key default gen_random_uuid(),
  signal_id     uuid not null references public.signals (id) on delete cascade,
  computed_at   timestamptz not null default now(),
  model_version text not null,
  total         smallint not null check (total between 0 and 100),
  breakdown     jsonb not null           -- full BreakoutScore object (factors, hype penalty, confidence)
);
create index signal_scores_latest_idx on public.signal_scores (signal_id, computed_at desc);

-- Time series observations (one row per metric per period)
create table public.signal_history (
  id          bigint generated always as identity primary key,
  signal_id   uuid not null references public.signals (id) on delete cascade,
  metric_id   text not null,
  label       text not null,
  unit        text not null,
  provenance  text not null check (provenance in ('demo','measured')),
  source_local_id text,
  min_volume  real,
  observed_on date not null,
  value       double precision not null,
  unique (signal_id, metric_id, observed_on)
);
create index signal_history_signal_idx on public.signal_history (signal_id, metric_id, observed_on);

-- Entities referenced by signals (technologies, companies, papers, repositories, standards)
create table public.entities (
  slug text primary key check (slug ~ '^[a-z0-9-]{2,120}$'),
  name text not null,
  kind text not null check (kind in ('technology','company','paper','repository','organization','standard'))
);
create index entities_name_trgm_idx on public.entities using gin (name extensions.gin_trgm_ops);

create table public.signal_entities (
  signal_id   uuid not null references public.signals (id) on delete cascade,
  entity_slug text not null references public.entities (slug) on delete cascade,
  primary key (signal_id, entity_slug)
);

-- ---------------------------------------------------------------------------
-- Personal data
-- ---------------------------------------------------------------------------
create table public.user_topics (
  user_id    uuid not null references auth.users (id) on delete cascade,
  topic_slug text not null references public.topics (slug) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, topic_slug)
);

create table public.saved_signals (
  user_id    uuid not null references auth.users (id) on delete cascade,
  signal_id  uuid not null references public.signals (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, signal_id)
);

-- ---------------------------------------------------------------------------
-- Ingestion pipeline (service role only)
-- ---------------------------------------------------------------------------
create table public.raw_events (
  id           bigint generated always as identity primary key,
  source       text not null,
  external_id  text not null,
  dedupe_key   text not null unique,
  fetched_at   timestamptz not null default now(),
  occurred_at  timestamptz,
  url          text,
  payload      jsonb not null,
  normalized   jsonb not null,
  signal_id    uuid references public.signals (id) on delete set null
);
create index raw_events_source_idx on public.raw_events (source, fetched_at desc);
create index raw_events_normalized_idx on public.raw_events using gin (normalized jsonb_path_ops);

create table public.pipeline_runs (
  id          uuid primary key default gen_random_uuid(),
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  status      text not null default 'running' check (status in ('running','succeeded','failed','partial')),
  stats       jsonb not null default '{}',
  error       text
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.topics          enable row level security;
alter table public.profiles        enable row level security;
alter table public.signals         enable row level security;
alter table public.signal_sources  enable row level security;
alter table public.signal_scores   enable row level security;
alter table public.signal_history  enable row level security;
alter table public.entities        enable row level security;
alter table public.signal_entities enable row level security;
alter table public.user_topics     enable row level security;
alter table public.saved_signals   enable row level security;
alter table public.raw_events      enable row level security;
alter table public.pipeline_runs   enable row level security;

-- Topics & entities: public read
create policy "topics are public" on public.topics for select using (true);
create policy "entities are public" on public.entities for select using (true);

-- Signals: public read of visible rows; admins read all and update
create policy "visible signals are public" on public.signals
  for select using (not is_hidden or (select public.is_admin()));
create policy "admins update signals" on public.signals
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Child tables inherit visibility from the parent signal
create policy "sources of visible signals" on public.signal_sources for select using (
  exists (select 1 from public.signals s where s.id = signal_id and (not s.is_hidden or (select public.is_admin())))
);
create policy "scores of visible signals" on public.signal_scores for select using (
  exists (select 1 from public.signals s where s.id = signal_id and (not s.is_hidden or (select public.is_admin())))
);
create policy "admins insert scores" on public.signal_scores
  for insert to authenticated with check ((select public.is_admin()));
create policy "history of visible signals" on public.signal_history for select using (
  exists (select 1 from public.signals s where s.id = signal_id and (not s.is_hidden or (select public.is_admin())))
);
create policy "entities of visible signals" on public.signal_entities for select using (
  exists (select 1 from public.signals s where s.id = signal_id and (not s.is_hidden or (select public.is_admin())))
);

-- Profiles: users read their own; admins read all. Only display_name is user-writable.
create policy "read own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or (select public.is_admin()));
create policy "update own profile" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke update on public.profiles from authenticated, anon;
grant update (display_name, updated_at) on public.profiles to authenticated;

-- Personal data: owner only
create policy "own topics" on public.user_topics
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own saves" on public.saved_signals
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Pipeline tables: no anon/authenticated access except admins reading run history
create policy "admins read pipeline runs" on public.pipeline_runs
  for select to authenticated using ((select public.is_admin()));

-- Column-level hardening: admins may edit editorial fields, never the id or slug
revoke update on public.signals from authenticated, anon;
grant update (title, dek, primary_topic, topics, status, time_to_impact, is_verified, is_hidden, content,
              score_total, score_band, confidence_level, momentum_ratio, developer_impact, updated_at)
  on public.signals to authenticated;

-- ---------------------------------------------------------------------------
-- Search across signals, entities, topics, papers and repositories
-- ---------------------------------------------------------------------------
create or replace function public.search_all(q text, max_results int default 30)
returns table (result_type text, title text, href text, snippet text, meta text[], score smallint, rank real)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with query as (
    select websearch_to_tsquery('english', left(q, 120)) as tsq, lower(left(q, 120)) as raw
  )
  (
    select 'signal' as result_type, s.title as title, '/signals/' || s.slug as href, s.dek as snippet,
           array[replace(s.primary_topic, '-', ' '), s.status, s.source_count || ' sources'] as meta,
           s.score_total as score,
           (ts_rank(s.search_vector, query.tsq) * 4 + similarity(s.title, query.raw) + s.score_total / 100.0)::real as rank
    from public.signals s, query
    where not s.is_hidden and (s.search_vector @@ query.tsq or s.title % query.raw)
  )
  union all
  (
    select e.kind, e.name, '/signals/' || s.slug, 'Referenced in: ' || s.title,
           array[e.kind, replace(s.primary_topic, '-', ' ')], null::smallint,
           (similarity(e.name, query.raw) * 3)::real
    from public.entities e
    join public.signal_entities se on se.entity_slug = e.slug
    join public.signals s on s.id = se.signal_id and not s.is_hidden,
    query
    where e.name % query.raw or e.name ilike '%' || query.raw || '%'
  )
  union all
  (
    select case when src.kind = 'paper' then 'paper' else 'repository' end, src.title,
           '/signals/' || s.slug || '#evidence', 'Cited by: ' || s.title,
           array[src.publisher, src.tier], null::smallint,
           (similarity(src.title, query.raw) * 2)::real
    from public.signal_sources src
    join public.signals s on s.id = src.signal_id and not s.is_hidden,
    query
    where src.kind in ('paper', 'github') and (src.title % query.raw or src.title ilike '%' || query.raw || '%')
  )
  union all
  (
    select 'topic', t.name, '/topics/' || t.slug, t.description, array['topic'], null::smallint,
           (similarity(t.name, query.raw) * 3 + 0.5)::real
    from public.topics t, query
    where t.name % query.raw or t.name ilike '%' || query.raw || '%' or t.description ilike '%' || query.raw || '%'
  )
  order by rank desc
  limit greatest(1, least(max_results, 50));
$$;

grant execute on function public.search_all(text, int) to anon, authenticated;
