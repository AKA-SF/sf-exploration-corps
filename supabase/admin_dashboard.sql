-- SF 탐사단 관리자 대시보드 1차 권한 정책
-- Supabase Dashboard > SQL Editor에서 실행하세요.
--
-- 관리자 지정:
-- Authentication > Users > 사용자 선택 > Raw app metadata에 아래처럼 추가
-- { "role": "admin" }

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    or coalesce(auth.jwt() -> 'app_metadata' -> 'roles', '[]'::jsonb) ? 'admin';
$$;

grant execute on function public.current_user_is_admin() to authenticated;

drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin" on public.profiles
  for select using (public.current_user_is_admin());

drop policy if exists "activity_select_admin" on public.activity_logs;
create policy "activity_select_admin" on public.activity_logs
  for select using (public.current_user_is_admin());

drop policy if exists "user_badges_select_admin" on public.user_badges;
create policy "user_badges_select_admin" on public.user_badges
  for select using (public.current_user_is_admin());

drop policy if exists "work_statuses_select_admin" on public.work_statuses;
create policy "work_statuses_select_admin" on public.work_statuses
  for select using (public.current_user_is_admin());

drop policy if exists "work_comments_delete_admin" on public.work_comments;
create policy "work_comments_delete_admin" on public.work_comments
  for delete using (public.current_user_is_admin());

drop policy if exists "radio_messages_delete_admin" on public.radio_messages;
create policy "radio_messages_delete_admin" on public.radio_messages
  for delete using (public.current_user_is_admin());

create or replace function public.admin_grant_mileage(
  target_user_id uuid,
  points integer,
  reason text default '관리자 MP 부여'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_user_is_admin() then
    raise exception 'admin role is required';
  end if;

  if target_user_id is null or points is null or points = 0 then
    raise exception 'target user and non-zero points are required';
  end if;

  insert into public.activity_logs (user_id, action_type, points, genre, metadata)
  values (
    target_user_id,
    'admin_mileage',
    points,
    '관리자 조정',
    jsonb_build_object('title', reason, 'admin_user_id', auth.uid())
  );
end;
$$;

grant execute on function public.admin_grant_mileage(uuid, integer, text) to authenticated;

create or replace function public.admin_set_member_title(
  target_user_id uuid,
  next_title text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_user_is_admin() then
    raise exception 'admin role is required';
  end if;

  if target_user_id is null or nullif(trim(next_title), '') is null then
    raise exception 'target user and title are required';
  end if;

  update public.profiles
  set title = trim(next_title),
      updated_at = now()
  where id = target_user_id;
end;
$$;

grant execute on function public.admin_set_member_title(uuid, text) to authenticated;

create or replace function public.admin_award_badge(
  target_user_id uuid,
  badge_id text,
  badge_title text,
  badge_description text default '관리자가 수동으로 지급한 히든 배지입니다.'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_user_is_admin() then
    raise exception 'admin role is required';
  end if;

  if target_user_id is null or nullif(trim(badge_id), '') is null or nullif(trim(badge_title), '') is null then
    raise exception 'target user, badge id, and badge title are required';
  end if;

  insert into public.badges (id, title, description, condition_key)
  values (
    lower(regexp_replace(trim(badge_id), '[^a-zA-Z0-9_-]+', '-', 'g')),
    trim(badge_title),
    coalesce(nullif(trim(badge_description), ''), '관리자가 수동으로 지급한 히든 배지입니다.'),
    'manual_hidden'
  )
  on conflict (id) do update set
    title = excluded.title,
    description = excluded.description,
    condition_key = excluded.condition_key;

  insert into public.user_badges (user_id, badge_id)
  values (
    target_user_id,
    lower(regexp_replace(trim(badge_id), '[^a-zA-Z0-9_-]+', '-', 'g'))
  )
  on conflict (user_id, badge_id) do nothing;
end;
$$;

grant execute on function public.admin_award_badge(uuid, text, text, text) to authenticated;

create or replace function public.admin_revoke_badge(
  p_target_user_id uuid,
  p_badge_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_user_is_admin() then
    raise exception 'admin role is required';
  end if;

  delete from public.user_badges
  where user_id = p_target_user_id
    and user_badges.badge_id = p_badge_id;
end;
$$;

grant execute on function public.admin_revoke_badge(uuid, text) to authenticated;
