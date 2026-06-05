-- SF 탐사단 관리자 대시보드 1차 권한 정책
-- Supabase Dashboard > SQL Editor에서 실행하세요.
--
-- 관리자 지정:
-- Authentication > Users > 사용자 선택 > Raw app metadata에 아래처럼 추가
-- { "role": "admin" }

alter table public.profiles
  add column if not exists title_override text;

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

create table if not exists public.admin_action_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) on delete set null,
  action_type text not null,
  target_type text not null,
  target_id text,
  target_label text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.member_admin_notes (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  note text not null default '',
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.admin_action_logs enable row level security;
alter table public.member_admin_notes enable row level security;

drop policy if exists "admin_action_logs_select_admin" on public.admin_action_logs;
create policy "admin_action_logs_select_admin" on public.admin_action_logs
  for select using (public.current_user_is_admin());

drop policy if exists "member_admin_notes_select_admin" on public.member_admin_notes;
create policy "member_admin_notes_select_admin" on public.member_admin_notes
  for select using (public.current_user_is_admin());

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

create or replace function public.admin_record_action(
  p_action_type text,
  p_target_type text,
  p_target_id text default null,
  p_target_label text default null,
  p_metadata jsonb default '{}'::jsonb
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

  insert into public.admin_action_logs (
    admin_user_id,
    action_type,
    target_type,
    target_id,
    target_label,
    metadata
  )
  values (
    auth.uid(),
    p_action_type,
    p_target_type,
    p_target_id,
    p_target_label,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

grant execute on function public.admin_record_action(text, text, text, text, jsonb) to authenticated;

create or replace function public.admin_upsert_member_note(
  p_target_user_id uuid,
  p_note text
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

  if p_target_user_id is null then
    raise exception 'target user is required';
  end if;

  insert into public.member_admin_notes (user_id, note, updated_by, updated_at)
  values (p_target_user_id, coalesce(p_note, ''), auth.uid(), now())
  on conflict (user_id) do update set
    note = excluded.note,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at;

  perform public.admin_record_action(
    'member_note_update',
    'profile',
    p_target_user_id::text,
    null,
    jsonb_build_object('note_length', length(coalesce(p_note, '')))
  );
end;
$$;

grant execute on function public.admin_upsert_member_note(uuid, text) to authenticated;

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

  perform public.admin_record_action(
    'mileage_grant',
    'profile',
    target_user_id::text,
    null,
    jsonb_build_object('points', points, 'reason', reason)
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
      title_override = trim(next_title),
      updated_at = now()
  where id = target_user_id;

  perform public.admin_record_action(
    'member_title_update',
    'profile',
    target_user_id::text,
    trim(next_title),
    jsonb_build_object('title_override', true)
  );
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

  perform public.admin_record_action(
    'badge_award',
    'profile',
    target_user_id::text,
    trim(badge_title),
    jsonb_build_object('badge_id', lower(regexp_replace(trim(badge_id), '[^a-zA-Z0-9_-]+', '-', 'g')))
  );
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

  perform public.admin_record_action(
    'badge_revoke',
    'profile',
    p_target_user_id::text,
    p_badge_id,
    '{}'::jsonb
  );
end;
$$;

grant execute on function public.admin_revoke_badge(uuid, text) to authenticated;
