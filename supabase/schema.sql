-- SF 탐사단 로그인/프로필/마일리지 1차 스키마
-- Supabase Dashboard > SQL Editor에서 전체 실행하세요.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null default '탐사 대원',
  public_code text,
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

create table if not exists public.work_comments (
  id uuid primary key default gen_random_uuid(),
  work_code text not null,
  work_title text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default '탐사자',
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.work_statuses (
  user_id uuid not null references auth.users(id) on delete cascade,
  work_code text not null,
  work_title text not null,
  status text not null check (status in ('want', 'reading', 'done')),
  updated_at timestamptz not null default now(),
  primary key (user_id, work_code)
);

create table if not exists public.radio_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default '탐사자',
  body text not null check (char_length(body) between 1 and 240),
  parent_id uuid references public.radio_messages(id) on delete cascade,
  recipient_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.crew_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  sender_name text not null default '탐사자',
  recipient_name text not null default '탐사자',
  sender_code text,
  recipient_code text,
  body text not null check (char_length(body) between 1 and 600),
  parent_id uuid references public.crew_messages(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists public_code text;

create unique index if not exists profiles_public_code_key
  on public.profiles (public_code);

create index if not exists work_comments_work_code_created_at_idx
  on public.work_comments (work_code, created_at);

create index if not exists work_statuses_user_status_idx
  on public.work_statuses (user_id, status);

create index if not exists radio_messages_created_at_idx
  on public.radio_messages (created_at desc);

create index if not exists radio_messages_parent_id_idx
  on public.radio_messages (parent_id, created_at);

create index if not exists crew_messages_recipient_created_at_idx
  on public.crew_messages (recipient_id, created_at desc);

create index if not exists crew_messages_sender_created_at_idx
  on public.crew_messages (sender_id, created_at desc);

create index if not exists crew_messages_parent_id_idx
  on public.crew_messages (parent_id, created_at);

alter table public.profiles enable row level security;
alter table public.activity_logs enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.work_comments enable row level security;
alter table public.work_statuses enable row level security;
alter table public.radio_messages enable row level security;
alter table public.crew_messages enable row level security;

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

drop policy if exists "work_comments_read_all" on public.work_comments;
create policy "work_comments_read_all" on public.work_comments
  for select using (true);

drop policy if exists "work_comments_insert_own" on public.work_comments;
create policy "work_comments_insert_own" on public.work_comments
  for insert with check (auth.uid() = user_id);

drop policy if exists "work_comments_update_own" on public.work_comments;
create policy "work_comments_update_own" on public.work_comments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "work_statuses_select_own" on public.work_statuses;
create policy "work_statuses_select_own" on public.work_statuses
  for select using (auth.uid() = user_id);

drop policy if exists "work_statuses_insert_own" on public.work_statuses;
create policy "work_statuses_insert_own" on public.work_statuses
  for insert with check (auth.uid() = user_id);

drop policy if exists "work_statuses_update_own" on public.work_statuses;
create policy "work_statuses_update_own" on public.work_statuses
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "radio_messages_read_all" on public.radio_messages;
create policy "radio_messages_read_all" on public.radio_messages
  for select using (true);

drop policy if exists "radio_messages_insert_own" on public.radio_messages;
create policy "radio_messages_insert_own" on public.radio_messages
  for insert with check (auth.uid() = user_id);

drop policy if exists "radio_messages_update_own" on public.radio_messages;
create policy "radio_messages_update_own" on public.radio_messages
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "crew_messages_select_participants" on public.crew_messages;
create policy "crew_messages_select_participants" on public.crew_messages
  for select using (auth.uid() = sender_id or auth.uid() = recipient_id);

drop policy if exists "crew_messages_insert_sender" on public.crew_messages;
create policy "crew_messages_insert_sender" on public.crew_messages
  for insert with check (auth.uid() = sender_id);

drop policy if exists "crew_messages_update_recipient_read" on public.crew_messages;
create policy "crew_messages_update_recipient_read" on public.crew_messages
  for update using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);

create or replace function public.generate_profile_public_code(p_user_id uuid)
returns text
language sql
stable
as $$
  select 'SFA-' || upper(substr(md5(p_user_id::text), 1, 6));
$$;

create or replace function public.ensure_profile_public_code()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.public_code is null then
    new.public_code := public.generate_profile_public_code(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_ensure_public_code on public.profiles;
create trigger profiles_ensure_public_code
  before insert or update on public.profiles
  for each row execute function public.ensure_profile_public_code();

update public.profiles
set public_code = public.generate_profile_public_code(id)
where public_code is null;

create or replace function public.get_public_crew_profile(p_public_code text)
returns table (
  id uuid,
  nickname text,
  public_code text,
  title text
)
language sql
security definer
set search_path = public
as $$
  select profiles.id, profiles.nickname, profiles.public_code, profiles.title
  from public.profiles
  where upper(profiles.public_code) = upper(p_public_code)
  limit 1;
$$;

do $$
begin
  alter publication supabase_realtime add table public.radio_messages;
  alter publication supabase_realtime add table public.crew_messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

insert into public.badges (id, title, description, condition_key) values
  ('first-signal', '첫 신호 수신', '첫 활동 기록을 남기면 획득', 'total_activity_1'),
  ('archive-scribe', '아카이브 기록자', '리뷰/로그 5개 작성', 'reviews_5'),
  ('quantum-reader', '양자역학 탐서가', '하드 SF 관련 기록 5개', 'hard_sf_5'),
  ('android-dream', '안드로이드의 꿈', '필립 K. 딕 관련 활동 3개', 'android_3'),
  ('resistance-leader', '저항군 리더', '디스토피아 관련 활동 5개', 'dystopia_5'),
  ('orbit-cartographer', '궤도 지도 제작자', '탐사 좌표/장르 관련 기록 3개', 'coordinates_3')
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  condition_key = excluded.condition_key;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_nickname text;
begin
  next_nickname := nullif(trim(coalesce(
    new.raw_user_meta_data ->> 'nickname',
    new.raw_user_meta_data ->> 'display_name',
    new.raw_user_meta_data ->> 'name',
    split_part(new.email, '@', 1),
    '탐사 대원'
  )), '');

  insert into public.profiles (id, nickname, public_code)
  values (
    new.id,
    left(coalesce(next_nickname, '탐사 대원'), 24),
    public.generate_profile_public_code(new.id)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

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
