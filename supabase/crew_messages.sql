-- SF 탐사단 개인 쪽지 / 대원 ID QR 연결 스키마
-- Supabase Dashboard > SQL Editor에서 전체 실행하세요.

alter table public.profiles
  add column if not exists public_code text;

create unique index if not exists profiles_public_code_key
  on public.profiles (public_code);

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

create index if not exists crew_messages_recipient_created_at_idx
  on public.crew_messages (recipient_id, created_at desc);

create index if not exists crew_messages_sender_created_at_idx
  on public.crew_messages (sender_id, created_at desc);

create index if not exists crew_messages_parent_id_idx
  on public.crew_messages (parent_id, created_at);

alter table public.crew_messages enable row level security;

drop policy if exists "crew_messages_select_participants" on public.crew_messages;
create policy "crew_messages_select_participants" on public.crew_messages
  for select using (auth.uid() = sender_id or auth.uid() = recipient_id);

drop policy if exists "crew_messages_insert_sender" on public.crew_messages;
create policy "crew_messages_insert_sender" on public.crew_messages
  for insert with check (auth.uid() = sender_id);

drop policy if exists "crew_messages_update_recipient_read" on public.crew_messages;
create policy "crew_messages_update_recipient_read" on public.crew_messages
  for update using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);

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
  alter publication supabase_realtime add table public.crew_messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
