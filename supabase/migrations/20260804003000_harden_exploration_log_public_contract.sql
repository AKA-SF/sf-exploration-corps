-- Public exploration-signal contract. This migration deliberately exposes only
-- approved fields through an RPC; exploration_logs itself remains owner-only.

alter table public.exploration_logs
  add column if not exists spoiler text not null default 'CLEAR_SIGNAL'
    check (spoiler in ('CLEAR_SIGNAL', 'CLASSIFIED_SIGNAL'));

alter table public.exploration_logs
  add column if not exists client_submission_id uuid;

create unique index if not exists exploration_logs_user_submission_unique
  on public.exploration_logs (user_id, client_submission_id)
  where client_submission_id is not null;

create or replace function public.get_visible_exploration_logs(p_limit integer default 80)
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
  where logs.visibility in ('ANON_NETWORK', 'PUBLIC_SIGNAL')
  order by logs.created_at desc, logs.id desc
  limit greatest(1, least(coalesce(p_limit, 80), 100));
$$;

revoke all on function public.get_visible_exploration_logs(integer) from public;
grant execute on function public.get_visible_exploration_logs(integer) to anon, authenticated;
