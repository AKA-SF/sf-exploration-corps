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
