-- Private key/value settings (no client access). owner_email is written by the build-time migration.
create table public.app_settings (
  key   text primary key,
  value text not null
);
alter table public.app_settings enable row level security;

-- New users become admin when their email matches the configured owner; everyone else is a member.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner text;
begin
  select value into v_owner from public.app_settings where key = 'owner_email';
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)), 80),
    case when v_owner is not null and lower(new.email) = lower(v_owner) then 'admin' else 'member' end
  );
  return new;
end;
$$;
