-- 관리자 편집형 SF 신작·소식·추천 게시물

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

revoke all on function public.current_user_is_admin() from public, anon;
grant execute on function public.current_user_is_admin() to authenticated;

create table if not exists public.sf_discoveries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,119}$'),
  title text not null check (char_length(trim(title)) between 1 and 160),
  kind text not null check (kind in ('NEW_RELEASE', 'UPCOMING', 'EDITOR_PICK')),
  media_type text not null check (media_type in ('NOVEL', 'FILM', 'SERIES', 'GAME', 'ANIMATION', 'OTHER')),
  summary text not null check (char_length(trim(summary)) between 1 and 500),
  source_name text not null check (char_length(trim(source_name)) between 1 and 120),
  source_url text not null check (source_url ~ '^https://'),
  image_url text check (image_url is null or image_url = '' or image_url ~ '^https://'),
  release_date date,
  is_spoiler boolean not null default false,
  is_published boolean not null default false,
  published_at timestamptz,
  sort_priority integer not null default 0 check (sort_priority between -1000 and 1000),
  internal_notes text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not is_published or published_at is not null)
);

create index if not exists sf_discoveries_public_feed_idx
  on public.sf_discoveries (sort_priority desc, published_at desc)
  where is_published = true;

create or replace function public.touch_sf_discovery_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
  end if;
  if new.is_published and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists touch_sf_discovery_updated_at on public.sf_discoveries;
create trigger touch_sf_discovery_updated_at
before insert or update on public.sf_discoveries
for each row execute function public.touch_sf_discovery_updated_at();

alter table public.sf_discoveries enable row level security;
revoke all on public.sf_discoveries from anon, authenticated;
grant select, insert, update, delete on public.sf_discoveries to authenticated;

drop policy if exists "sf_discoveries_select_admin" on public.sf_discoveries;
create policy "sf_discoveries_select_admin" on public.sf_discoveries
  for select using (public.current_user_is_admin());

drop policy if exists "sf_discoveries_insert_admin" on public.sf_discoveries;
create policy "sf_discoveries_insert_admin" on public.sf_discoveries
  for insert with check (public.current_user_is_admin());

drop policy if exists "sf_discoveries_update_admin" on public.sf_discoveries;
create policy "sf_discoveries_update_admin" on public.sf_discoveries
  for update using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

drop policy if exists "sf_discoveries_delete_admin" on public.sf_discoveries;
create policy "sf_discoveries_delete_admin" on public.sf_discoveries
  for delete using (public.current_user_is_admin());

drop function if exists public.get_published_sf_discoveries(integer, integer, text, text);
create function public.get_published_sf_discoveries(
  p_limit integer default 24,
  p_offset integer default 0,
  p_kind text default null,
  p_media_type text default null
)
returns table (
  id uuid,
  slug text,
  title text,
  kind text,
  media_type text,
  summary text,
  source_name text,
  source_url text,
  image_url text,
  release_date date,
  is_spoiler boolean,
  published_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    d.id,
    d.slug,
    d.title,
    d.kind,
    d.media_type,
    d.summary,
    d.source_name,
    d.source_url,
    nullif(d.image_url, ''),
    d.release_date,
    d.is_spoiler,
    d.published_at,
    d.updated_at
  from public.sf_discoveries d
  where d.is_published = true
    and d.published_at <= now()
    and (p_kind is null or d.kind = p_kind)
    and (p_media_type is null or d.media_type = p_media_type)
  order by d.sort_priority desc, d.published_at desc, d.created_at desc
  limit least(greatest(coalesce(p_limit, 24), 1), 60)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.get_published_sf_discoveries(integer, integer, text, text) from public, anon, authenticated;
grant execute on function public.get_published_sf_discoveries(integer, integer, text, text) to anon, authenticated;
