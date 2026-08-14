-- Repair the canonical crew profile prerequisites on existing environments.
-- This intentionally touches only public.profiles and its public-code helpers.

do $$
begin
  if to_regclass('public.profiles') is null then
    raise exception 'crew profile prerequisite repair requires table public.profiles';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'id'
  ) then
    raise exception 'crew profile prerequisite repair requires profiles.id';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'nickname'
  ) then
    raise exception 'crew profile prerequisite repair requires profiles.nickname';
  end if;
end $$;

alter table public.profiles
  add column if not exists public_code text;

alter table public.profiles
  add column if not exists title text not null default '탐사보조원';

create or replace function public.generate_profile_public_code(p_user_id uuid)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select 'SFA-' || upper(substr(md5(p_user_id::text), 1, 6));
$$;

update public.profiles
set public_code = public.generate_profile_public_code(id)
where public_code is null;

create unique index if not exists profiles_public_code_key
  on public.profiles (public_code);

create or replace function public.ensure_profile_public_code()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.public_code is null then
    new.public_code := public.generate_profile_public_code(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_ensure_public_code on public.profiles;
create trigger profiles_ensure_public_code
  before insert or update on public.profiles
  for each row execute function public.ensure_profile_public_code();
