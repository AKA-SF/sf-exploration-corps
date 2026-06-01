-- SF 탐사단 네트워크 무전 채널 전용 스키마
-- Supabase Dashboard > SQL Editor에서 전체 실행하세요.

create table if not exists public.radio_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default '탐사자',
  body text not null check (char_length(body) between 1 and 240),
  parent_id uuid references public.radio_messages(id) on delete cascade,
  recipient_name text,
  created_at timestamptz not null default now()
);

create index if not exists radio_messages_created_at_idx
  on public.radio_messages (created_at desc);

create index if not exists radio_messages_parent_id_idx
  on public.radio_messages (parent_id, created_at);

alter table public.radio_messages enable row level security;

drop policy if exists "radio_messages_read_all" on public.radio_messages;
create policy "radio_messages_read_all" on public.radio_messages
  for select using (true);

drop policy if exists "radio_messages_insert_own" on public.radio_messages;
create policy "radio_messages_insert_own" on public.radio_messages
  for insert with check (auth.uid() = user_id);

drop policy if exists "radio_messages_update_own" on public.radio_messages;
create policy "radio_messages_update_own" on public.radio_messages
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

do $$
begin
  alter publication supabase_realtime add table public.radio_messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
