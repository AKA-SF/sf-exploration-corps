-- SF 탐사단 커뮤니티 게시판 Supabase 전환용 SQL
-- Supabase Dashboard > SQL Editor에서 이 파일 전체를 실행하세요.

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default '탐사자',
  category text not null default '자유글' check (category in ('자유글', '작품추천', '질문', '토론')),
  title text not null check (char_length(title) between 1 and 140),
  body text not null check (char_length(body) between 1 and 8000),
  attachment_url text,
  view_count integer not null default 0,
  status text not null default 'public' check (status in ('public', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default '탐사자',
  body text not null check (char_length(body) between 1 and 2000),
  status text not null default 'public' check (status in ('public', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists community_posts_created_at_idx
  on public.community_posts (status, created_at desc);

create index if not exists community_posts_category_created_at_idx
  on public.community_posts (category, status, created_at desc);

create index if not exists community_posts_user_created_at_idx
  on public.community_posts (user_id, created_at desc);

create index if not exists community_comments_post_created_at_idx
  on public.community_comments (post_id, status, created_at);

create index if not exists community_comments_user_created_at_idx
  on public.community_comments (user_id, created_at desc);

alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;

create or replace function public.is_sf_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    or coalesce(auth.jwt() -> 'app_metadata' -> 'roles', '[]'::jsonb) ? 'admin';
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists community_posts_touch_updated_at on public.community_posts;
create trigger community_posts_touch_updated_at
  before update on public.community_posts
  for each row execute function public.touch_updated_at();

drop trigger if exists community_comments_touch_updated_at on public.community_comments;
create trigger community_comments_touch_updated_at
  before update on public.community_comments
  for each row execute function public.touch_updated_at();

drop policy if exists "community_posts_read_public" on public.community_posts;
create policy "community_posts_read_public" on public.community_posts
  for select using (status = 'public' or auth.uid() = user_id or public.is_sf_admin());

drop policy if exists "community_posts_insert_own" on public.community_posts;
create policy "community_posts_insert_own" on public.community_posts
  for insert with check (auth.uid() = user_id);

drop policy if exists "community_posts_update_own_or_admin" on public.community_posts;
create policy "community_posts_update_own_or_admin" on public.community_posts
  for update using (auth.uid() = user_id or public.is_sf_admin())
  with check (auth.uid() = user_id or public.is_sf_admin());

drop policy if exists "community_posts_delete_own_or_admin" on public.community_posts;
create policy "community_posts_delete_own_or_admin" on public.community_posts
  for delete using (auth.uid() = user_id or public.is_sf_admin());

drop policy if exists "community_comments_read_public" on public.community_comments;
create policy "community_comments_read_public" on public.community_comments
  for select using (
    (
      status = 'public'
      and exists (
        select 1
        from public.community_posts
        where community_posts.id = community_comments.post_id
          and community_posts.status = 'public'
      )
    )
    or auth.uid() = user_id
    or public.is_sf_admin()
  );

drop policy if exists "community_comments_insert_own" on public.community_comments;
create policy "community_comments_insert_own" on public.community_comments
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.community_posts
      where community_posts.id = post_id
        and community_posts.status = 'public'
    )
  );

drop policy if exists "community_comments_update_own_or_admin" on public.community_comments;
create policy "community_comments_update_own_or_admin" on public.community_comments
  for update using (auth.uid() = user_id or public.is_sf_admin())
  with check (auth.uid() = user_id or public.is_sf_admin());

drop policy if exists "community_comments_delete_own_or_admin" on public.community_comments;
create policy "community_comments_delete_own_or_admin" on public.community_comments
  for delete using (auth.uid() = user_id or public.is_sf_admin());

create or replace function public.increment_community_post_view(p_post_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  next_count integer;
begin
  update public.community_posts
  set view_count = view_count + 1
  where id = p_post_id
    and status = 'public'
  returning view_count into next_count;

  return coalesce(next_count, 0);
end;
$$;

grant execute on function public.increment_community_post_view(uuid) to anon, authenticated;

do $$
begin
  alter publication supabase_realtime add table public.community_posts;
  alter publication supabase_realtime add table public.community_comments;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
