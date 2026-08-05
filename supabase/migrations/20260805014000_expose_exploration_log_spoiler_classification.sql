-- Forward-only repair: expose the user's spoiler classification so public UI can
-- require explicit consent before rendering classified signal content.

drop function if exists public.get_visible_exploration_logs(integer);

create function public.get_visible_exploration_logs(p_limit integer default 80)
returns table (
  id uuid,
  title text,
  log_type text,
  experiences jsonb,
  emotions jsonb,
  ideas jsonb,
  memo text,
  visibility text,
  nickname text,
  spoiler text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    logs.id,
    logs.title,
    logs.log_type,
    logs.experiences,
    logs.emotions,
    logs.ideas,
    case when logs.visibility = 'PUBLIC_SIGNAL' then logs.memo else null end as memo,
    logs.visibility,
    case when logs.visibility = 'PUBLIC_SIGNAL' then profiles.nickname else null end as nickname,
    logs.spoiler,
    logs.created_at
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
  id uuid,
  title text,
  log_type text,
  experiences jsonb,
  emotions jsonb,
  ideas jsonb,
  memo text,
  visibility text,
  nickname text,
  spoiler text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    logs.id,
    logs.title,
    logs.log_type,
    logs.experiences,
    logs.emotions,
    logs.ideas,
    case when logs.visibility = 'PUBLIC_SIGNAL' then logs.memo else null end as memo,
    logs.visibility,
    case when logs.visibility = 'PUBLIC_SIGNAL' then profiles.nickname else null end as nickname,
    logs.spoiler,
    logs.created_at
  from public.exploration_logs as logs
  left join public.profiles as profiles on profiles.id = logs.user_id
  where logs.id = p_id
    and logs.visibility in ('ANON_NETWORK', 'PUBLIC_SIGNAL')
  limit 1;
$$;

revoke all on function public.get_visible_exploration_log_detail(uuid) from public, anon, authenticated;
grant execute on function public.get_visible_exploration_log_detail(uuid) to anon, authenticated;
