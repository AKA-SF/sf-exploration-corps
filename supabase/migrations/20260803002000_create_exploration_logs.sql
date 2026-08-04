-- Canonical, account-scoped records for completed SF exploration reports.
-- Apply through the Supabase SQL editor or migration runner only after review.

create table if not exists public.exploration_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 240),
  log_type text not null check (char_length(trim(log_type)) between 1 and 120),
  experiences jsonb not null,
  emotions jsonb not null default '[]'::jsonb,
  ideas jsonb not null default '[]'::jsonb,
  memo text not null default '' check (char_length(memo) <= 10000),
  visibility text not null default 'PRIVATE_ARCHIVE'
    check (visibility in ('PRIVATE_ARCHIVE', 'ANON_NETWORK', 'PUBLIC_SIGNAL')),
  legacy_source_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists exploration_logs_user_created_at_idx
  on public.exploration_logs (user_id, created_at desc, id desc);

create index if not exists exploration_logs_visibility_created_at_idx
  on public.exploration_logs (visibility, created_at desc, id desc);

create unique index if not exists exploration_logs_user_legacy_source_unique
  on public.exploration_logs (user_id, legacy_source_id)
  where legacy_source_id is not null;

alter table public.exploration_logs enable row level security;

drop policy if exists "exploration_logs_select_own" on public.exploration_logs;
create policy "exploration_logs_select_own" on public.exploration_logs
  for select using (auth.uid() = user_id);

drop policy if exists "exploration_logs_insert_own" on public.exploration_logs;
create policy "exploration_logs_insert_own" on public.exploration_logs
  for insert with check (auth.uid() = user_id);

drop policy if exists "exploration_logs_update_own" on public.exploration_logs;
create policy "exploration_logs_update_own" on public.exploration_logs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "exploration_logs_delete_own" on public.exploration_logs;
create policy "exploration_logs_delete_own" on public.exploration_logs
  for delete using (auth.uid() = user_id);
