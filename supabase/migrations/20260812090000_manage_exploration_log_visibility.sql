-- Private-first lifecycle for account-owned exploration records.

create or replace function public.force_exploration_log_private_on_insert()
returns trigger
language plpgsql
as $$
begin
  new.visibility := 'PRIVATE_ARCHIVE';
  return new;
end;
$$;

drop trigger if exists exploration_logs_force_private_insert on public.exploration_logs;
create trigger exploration_logs_force_private_insert
before insert on public.exploration_logs
for each row execute function public.force_exploration_log_private_on_insert();

create or replace function public.touch_exploration_log_updated_at()
returns trigger
language plpgsql
as $$
begin
  if new.visibility is distinct from old.visibility
    and new.visibility <> 'PRIVATE_ARCHIVE'
    and current_setting('app.exploration_visibility_transition', true) is distinct from 'allowed' then
    raise exception 'visibility changes require the owner lifecycle command';
  end if;
  if new.visibility <> 'PRIVATE_ARCHIVE'
    and current_setting('app.exploration_visibility_transition', true) is distinct from 'allowed' then
    new.visibility := 'PRIVATE_ARCHIVE';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists exploration_logs_manage_updates on public.exploration_logs;
create trigger exploration_logs_manage_updates
before update on public.exploration_logs
for each row execute function public.touch_exploration_log_updated_at();

create or replace function public.set_own_exploration_log_visibility(p_id uuid, p_visibility text)
returns public.exploration_logs
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_log public.exploration_logs;
begin
  if p_visibility not in ('PRIVATE_ARCHIVE', 'ANON_NETWORK', 'PUBLIC_SIGNAL') then
    raise exception 'invalid exploration log visibility';
  end if;
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  perform set_config('app.exploration_visibility_transition', 'allowed', true);
  update public.exploration_logs
  set visibility = p_visibility
  where id = p_id and user_id = auth.uid()
  returning * into updated_log;
  if updated_log.id is null then
    raise exception 'exploration log not found';
  end if;
  return updated_log;
end;
$$;

grant execute on function public.set_own_exploration_log_visibility(uuid, text) to authenticated;

create or replace function public.clear_exploration_log_public_cache()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.public_archive_cache where cache_key like 'home-feed:%';
  return null;
end;
$$;

drop trigger if exists exploration_logs_clear_public_cache on public.exploration_logs;
create trigger exploration_logs_clear_public_cache
after insert or update or delete on public.exploration_logs
for each row execute function public.clear_exploration_log_public_cache();

-- Classified signals stay discoverable, but their content is redacted before it
-- leaves the database. The UI may still show a spoiler marker without receiving
-- title, scores, tags, or memo.
drop function if exists public.get_visible_exploration_logs(integer);
create function public.get_visible_exploration_logs(p_limit integer default 80)
returns table (
  id uuid, title text, log_type text, experiences jsonb, emotions jsonb, ideas jsonb,
  memo text, visibility text, nickname text, spoiler text, created_at timestamptz
)
language sql stable security definer set search_path = public, pg_temp as $$
  select logs.id,
    case when logs.spoiler = 'CLASSIFIED_SIGNAL' then null else logs.title end,
    case when logs.spoiler = 'CLASSIFIED_SIGNAL' then null else logs.log_type end,
    case when logs.spoiler = 'CLASSIFIED_SIGNAL' then null else logs.experiences end,
    case when logs.spoiler = 'CLASSIFIED_SIGNAL' then null else logs.emotions end,
    case when logs.spoiler = 'CLASSIFIED_SIGNAL' then null else logs.ideas end,
    case when logs.visibility = 'PUBLIC_SIGNAL' and logs.spoiler <> 'CLASSIFIED_SIGNAL' then logs.memo else null end,
    logs.visibility,
    case when logs.visibility = 'PUBLIC_SIGNAL' then profiles.nickname else null end,
    logs.spoiler, logs.created_at
  from public.exploration_logs as logs
  left join public.profiles as profiles on profiles.id = logs.user_id
  where logs.visibility in ('ANON_NETWORK', 'PUBLIC_SIGNAL')
  order by logs.created_at desc, logs.id desc
  limit greatest(1, least(coalesce(p_limit, 80), 100));
$$;
revoke all on function public.get_visible_exploration_logs(integer) from public, anon, authenticated;
grant execute on function public.get_visible_exploration_logs(integer) to anon, authenticated;

drop function if exists public.get_visible_exploration_log_detail(uuid);
create function public.get_visible_exploration_log_detail(p_id uuid)
returns table (
  id uuid, title text, log_type text, experiences jsonb, emotions jsonb, ideas jsonb,
  memo text, visibility text, nickname text, spoiler text, created_at timestamptz
)
language sql stable security definer set search_path = public, pg_temp as $$
  select logs.id,
    case when logs.spoiler = 'CLASSIFIED_SIGNAL' then null else logs.title end,
    case when logs.spoiler = 'CLASSIFIED_SIGNAL' then null else logs.log_type end,
    case when logs.spoiler = 'CLASSIFIED_SIGNAL' then null else logs.experiences end,
    case when logs.spoiler = 'CLASSIFIED_SIGNAL' then null else logs.emotions end,
    case when logs.spoiler = 'CLASSIFIED_SIGNAL' then null else logs.ideas end,
    case when logs.visibility = 'PUBLIC_SIGNAL' and logs.spoiler <> 'CLASSIFIED_SIGNAL' then logs.memo else null end,
    logs.visibility,
    case when logs.visibility = 'PUBLIC_SIGNAL' then profiles.nickname else null end,
    logs.spoiler, logs.created_at
  from public.exploration_logs as logs
  left join public.profiles as profiles on profiles.id = logs.user_id
  where logs.id = p_id
    and logs.visibility in ('ANON_NETWORK', 'PUBLIC_SIGNAL')
  limit 1;
$$;
revoke all on function public.get_visible_exploration_log_detail(uuid) from public, anon, authenticated;
grant execute on function public.get_visible_exploration_log_detail(uuid) to anon, authenticated;
