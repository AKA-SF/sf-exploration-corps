-- Canonical authenticated crew profile lookup used by the private message route.
-- The profiles table and its public_code column are baseline prerequisites;
-- this migration intentionally does not create or alter unrelated messaging schema.

do $$
begin
  if to_regclass('public.profiles') is null then
    raise exception 'crew profile RPC prerequisite missing: table public.profiles; apply supabase/schema.sql baseline before migrations';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'id'
  ) then
    raise exception 'crew profile RPC prerequisite missing: profiles.id';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'nickname'
  ) then
    raise exception 'crew profile RPC prerequisite missing: profiles.nickname';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'public_code'
  ) then
    raise exception 'crew profile RPC prerequisite missing: profiles.public_code';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'title'
  ) then
    raise exception 'crew profile RPC prerequisite missing: profiles.title';
  end if;

  if to_regprocedure('public.generate_profile_public_code(uuid)') is null then
    raise exception 'crew profile RPC prerequisite missing: public.generate_profile_public_code(uuid)';
  end if;
end $$;

create or replace function public.get_public_crew_profile(p_public_code text)
returns table (
  id uuid,
  nickname text,
  public_code text,
  title text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    profiles.id,
    profiles.nickname,
    profiles.public_code,
    profiles.title
  from public.profiles as profiles
  where auth.uid() is not null
    and upper(trim(p_public_code)) ~ '^SFA-[A-Z0-9]{6}$'
    and upper(profiles.public_code) = upper(trim(p_public_code))
  limit 1;
$$;

revoke all on function public.get_public_crew_profile(text) from public;
revoke all on function public.get_public_crew_profile(text) from anon;
grant execute on function public.get_public_crew_profile(text) to authenticated;
