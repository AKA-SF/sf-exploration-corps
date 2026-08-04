create or replace function public.get_visible_exploration_log_detail(p_id uuid)
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
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
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
    logs.created_at
  from public.exploration_logs as logs
  left join public.profiles as profiles on profiles.id = logs.user_id
  where logs.id = p_id
    and logs.visibility in ('ANON_NETWORK', 'PUBLIC_SIGNAL')
  limit 1;
$$;

revoke all on function public.get_visible_exploration_log_detail(uuid) from public;
grant execute on function public.get_visible_exploration_log_detail(uuid) to anon, authenticated;
