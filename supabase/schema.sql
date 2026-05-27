-- SF 탐사단 로그인/프로필/마일리지 1차 스키마
-- Supabase Dashboard > SQL Editor에서 전체 실행하세요.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null default '탐사 대원',
  mileage integer not null default 0,
  title text not null default '수습 대원',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action_type text not null,
  points integer not null default 0,
  genre text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.badges (
  id text primary key,
  title text not null,
  description text not null,
  condition_key text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_badges (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id text not null references public.badges(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

alter table public.profiles enable row level security;
alter table public.activity_logs enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "activity_select_own" on public.activity_logs;
create policy "activity_select_own" on public.activity_logs
  for select using (auth.uid() = user_id);

drop policy if exists "activity_insert_own" on public.activity_logs;
create policy "activity_insert_own" on public.activity_logs
  for insert with check (auth.uid() = user_id);

drop policy if exists "badges_read_all" on public.badges;
create policy "badges_read_all" on public.badges
  for select using (true);

drop policy if exists "user_badges_select_own" on public.user_badges;
create policy "user_badges_select_own" on public.user_badges
  for select using (auth.uid() = user_id);

insert into public.badges (id, title, description, condition_key) values
  ('first-signal', '첫 신호 수신', '첫 활동 기록을 남기면 획득', 'total_activity_1'),
  ('archive-scribe', '아카이브 기록자', '리뷰/로그 5개 작성', 'reviews_5'),
  ('quantum-reader', '양자역학 탐서가', '하드 SF 관련 기록 5개', 'hard_sf_5'),
  ('android-dream', '안드로이드의 꿈', '필립 K. 딕 관련 활동 3개', 'android_3'),
  ('resistance-leader', '저항군 리더', '디스토피아 관련 활동 5개', 'dystopia_5')
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  condition_key = excluded.condition_key;

create or replace function public.update_profile_mileage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set mileage = greatest(0, mileage + new.points),
      title = case
        when greatest(0, mileage + new.points) >= 1500 then '포스트휴먼'
        when greatest(0, mileage + new.points) >= 700 then '함장'
        when greatest(0, mileage + new.points) >= 300 then '선임 항해사'
        when greatest(0, mileage + new.points) >= 100 then '항해사'
        else '수습 대원'
      end,
      updated_at = now()
  where id = new.user_id;
  return new;
end;
$$;

drop trigger if exists activity_logs_update_profile_mileage on public.activity_logs;
create trigger activity_logs_update_profile_mileage
  after insert on public.activity_logs
  for each row execute function public.update_profile_mileage();
