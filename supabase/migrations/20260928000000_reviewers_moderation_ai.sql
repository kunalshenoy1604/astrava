-- Astrava schema v2: reviewer applications, Wikipedia-style moderation with a
-- public log, and a cache for AI-assisted enrichment.

-- ---------------------------------------------------------------------------
-- Moderation: reviewers hide/restore signals from public view with a written
-- reason. Keyed by slug so it applies to live-computed and stored signals.
-- ---------------------------------------------------------------------------
create table public.signal_moderation (
  signal_slug text primary key check (signal_slug ~ '^[a-z0-9-]{3,120}$'),
  hidden      boolean not null default true,
  reason      text not null check (char_length(reason) between 20 and 1000),
  actor_id    uuid references auth.users (id) on delete set null,
  updated_at  timestamptz not null default now()
);

create table public.moderation_log (
  id           bigint generated always as identity primary key,
  signal_slug  text not null,
  signal_title text,
  action       text not null check (action in ('hide', 'restore')),
  reason       text not null,
  actor_id     uuid references auth.users (id) on delete set null,
  actor_name   text,
  created_at   timestamptz not null default now()
);
create index moderation_log_recent_idx on public.moderation_log (created_at desc);

alter table public.signal_moderation enable row level security;
alter table public.moderation_log enable row level security;
create policy "moderation state is public" on public.signal_moderation for select using (true);
create policy "moderation log is public" on public.moderation_log for select using (true);

-- The only write path: validates role and reason, writes state and log atomically.
create or replace function public.moderate_signal(p_slug text, p_title text, p_action text, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  if not public.is_reviewer() then
    raise exception 'Only reviewers can moderate signals' using errcode = '42501';
  end if;
  if p_action not in ('hide', 'restore') then
    raise exception 'Unknown action %', p_action using errcode = '22023';
  end if;
  if char_length(coalesce(trim(p_reason), '')) < 20 then
    raise exception 'A reason of at least 20 characters is required' using errcode = '22023';
  end if;
  select coalesce(display_name, 'Reviewer') into v_name from public.profiles where id = auth.uid();
  insert into public.signal_moderation (signal_slug, hidden, reason, actor_id, updated_at)
    values (p_slug, p_action = 'hide', trim(p_reason), auth.uid(), now())
    on conflict (signal_slug) do update
      set hidden = excluded.hidden, reason = excluded.reason, actor_id = excluded.actor_id, updated_at = now();
  insert into public.moderation_log (signal_slug, signal_title, action, reason, actor_id, actor_name)
    values (p_slug, left(p_title, 200), p_action, trim(p_reason), auth.uid(), v_name);
end;
$$;
revoke all on function public.moderate_signal(text, text, text, text) from public, anon;
grant execute on function public.moderate_signal(text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Reviewer applications (structured case for access; owner approves)
-- ---------------------------------------------------------------------------
create table public.reviewer_applications (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  email              text not null,
  full_name          text not null check (char_length(full_name) between 2 and 120),
  profile_links      text[] not null default '{}',
  expertise          text[] not null check (cardinality(expertise) between 1 and 5),
  motivation         text not null check (char_length(motivation) between 200 and 4000),
  experience         text not null check (char_length(experience) between 150 and 4000),
  sample_signal_slug text,
  sample_review      text not null check (char_length(sample_review) between 200 and 4000),
  conflicts          text not null check (char_length(conflicts) between 2 and 2000),
  hours_per_week     smallint not null check (hours_per_week between 1 and 40),
  agreed_guidelines  boolean not null check (agreed_guidelines),
  status             text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  decision_note      text,
  decided_at         timestamptz,
  created_at         timestamptz not null default now()
);
create unique index reviewer_applications_one_pending on public.reviewer_applications (user_id) where status = 'pending';

alter table public.reviewer_applications enable row level security;
create policy "apply for yourself" on public.reviewer_applications
  for insert to authenticated with check (user_id = (select auth.uid()) and status = 'pending');
create policy "read own applications" on public.reviewer_applications
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "admins decide applications" on public.reviewer_applications
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- AI enrichment cache (service role only)
-- ---------------------------------------------------------------------------
create table public.ai_enrichments (
  cache_key  text primary key,
  model      text not null,
  result     jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.ai_enrichments enable row level security;
