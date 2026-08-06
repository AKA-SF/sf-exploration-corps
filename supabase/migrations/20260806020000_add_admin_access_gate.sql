-- Admin UI의 별도 접속 비밀번호 hash, 세션 세대, 지속 rate limit 저장소.
-- 평문 비밀번호와 bootstrap hash는 migration에 저장하지 않는다.

create table if not exists public.admin_access_settings (
  singleton boolean primary key default true check (singleton),
  password_hash text not null check (length(password_hash) between 40 and 512),
  session_version bigint not null default 1 check (session_version > 0),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.admin_access_settings enable row level security;
revoke all on table public.admin_access_settings from public, anon, authenticated;
grant select, insert, update, delete on table public.admin_access_settings to service_role;

create table if not exists public.admin_access_attempts (
  attempt_key text primary key check (length(attempt_key) = 64),
  failure_count integer not null default 0 check (failure_count >= 0),
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.admin_access_attempts enable row level security;
revoke all on table public.admin_access_attempts from public, anon, authenticated;
grant select, insert, update, delete on table public.admin_access_attempts to service_role;

create or replace function public.admin_access_rate_limit(
  p_key text,
  p_action text
)
returns table (
  allowed boolean,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_attempt public.admin_access_attempts;
  next_failures integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required';
  end if;

  if p_key !~ '^[a-f0-9]{64}$' or p_action not in ('attempt', 'success') then
    raise exception 'invalid admin access rate limit request';
  end if;

  if p_action = 'success' then
    delete from public.admin_access_attempts where attempt_key = p_key;
    return query select true, 0;
    return;
  end if;

  select * into current_attempt
  from public.admin_access_attempts
  where attempt_key = p_key
  for update;

  if current_attempt.attempt_key is not null
    and current_attempt.blocked_until is not null
    and current_attempt.blocked_until > now()
  then
    return query select false, greatest(1, ceil(extract(epoch from (current_attempt.blocked_until - now())))::integer);
    return;
  end if;

  insert into public.admin_access_attempts as attempts (
    attempt_key,
    failure_count,
    window_started_at,
    blocked_until,
    updated_at
  ) values (
    p_key,
    1,
    now(),
    null,
    now()
  )
  on conflict (attempt_key) do update set
    failure_count = case
      when attempts.window_started_at < now() - interval '15 minutes' then 1
      else attempts.failure_count + 1
    end,
    window_started_at = case
      when attempts.window_started_at < now() - interval '15 minutes' then now()
      else attempts.window_started_at
    end,
    blocked_until = case
      when (
        case
          when attempts.window_started_at < now() - interval '15 minutes' then 1
          else attempts.failure_count + 1
        end
      ) > 5 then now() + interval '15 minutes'
      else null
    end,
    updated_at = now()
  returning * into current_attempt;

  next_failures := current_attempt.failure_count;

  if next_failures > 5 then
    return query select false, 900;
  else
    return query select true, 0;
  end if;
end;
$$;

revoke all on function public.admin_access_rate_limit(text, text) from public, anon, authenticated;
grant execute on function public.admin_access_rate_limit(text, text) to service_role;
