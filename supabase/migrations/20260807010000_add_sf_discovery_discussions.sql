-- Published SF discovery cards expose compact bibliographic metadata and
-- support a minimal, authenticated discussion surface without exposing user IDs.

create table public.sf_discovery_comments (
  id uuid primary key default gen_random_uuid(),
  discovery_id uuid not null references public.sf_discoveries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null check (char_length(author_name) between 1 and 40),
  body text not null check (char_length(body) between 1 and 1000),
  status text not null default 'PUBLIC' check (status in ('PUBLIC', 'ARCHIVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sf_discovery_comments_discovery_created_idx
  on public.sf_discovery_comments (discovery_id, created_at)
  where status = 'PUBLIC';

alter table public.sf_discovery_comments enable row level security;
revoke all on public.sf_discovery_comments from public, anon, authenticated;

create or replace function public.touch_sf_discovery_comment_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger touch_sf_discovery_comment_updated_at
  before update on public.sf_discovery_comments
  for each row execute function public.touch_sf_discovery_comment_updated_at();

-- The public list projection includes only display-safe bibliographic fields.
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
  author_text text,
  publisher_text text,
  release_date date,
  source_name text,
  source_url text,
  image_url text,
  image_alt text,
  is_spoiler boolean,
  has_editorial_detail boolean,
  published_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    d.id,
    d.slug,
    d.title,
    d.kind,
    d.media_type,
    d.summary,
    d.author_text,
    d.publisher_text,
    d.release_date,
    d.source_name,
    d.source_url,
    d.image_url,
    d.image_alt,
    d.is_spoiler,
    d.kind = 'EDITOR_PICK'
      and d.editorial_stage = 'APPROVED'
      and public.sf_editorial_payload_is_valid(d.editorial_payload),
    d.published_at,
    d.updated_at
  from public.sf_discoveries d
  where d.publication_status = 'PUBLISHED'
    and d.published_at is not null
    and d.published_at <= now()
    and (p_kind is null or d.kind = p_kind)
    and (p_media_type is null or d.media_type = p_media_type)
  order by d.sort_priority desc, d.published_at desc, d.id desc
  limit least(greatest(coalesce(p_limit, 24), 1), 60)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.get_published_sf_discoveries(integer, integer, text, text)
  from public, anon, authenticated;
grant execute on function public.get_published_sf_discoveries(integer, integer, text, text)
  to anon, authenticated;

-- Keep list and detail projections aligned when bibliographic fields are added.
drop function if exists public.get_published_sf_discovery(text);
create function public.get_published_sf_discovery(p_slug text)
returns table (
  id uuid,
  slug text,
  title text,
  kind text,
  media_type text,
  summary text,
  author_text text,
  publisher_text text,
  source_name text,
  source_url text,
  image_url text,
  image_alt text,
  is_spoiler boolean,
  editorial_payload jsonb,
  published_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    d.id,
    d.slug,
    d.title,
    d.kind,
    d.media_type,
    d.summary,
    d.author_text,
    d.publisher_text,
    d.source_name,
    d.source_url,
    d.image_url,
    d.image_alt,
    d.is_spoiler,
    jsonb_set(
      d.editorial_payload,
      '{books}',
      coalesce((
        select jsonb_agg(
          (book.value #- '{cover,rights_note}') #- '{cover,rights_status}'
          order by book.ordinality
        )
        from jsonb_array_elements(d.editorial_payload -> 'books') with ordinality as book(value, ordinality)
      ), '[]'::jsonb)
    ),
    d.published_at,
    d.updated_at
  from public.sf_discoveries d
  where d.slug = p_slug
    and d.publication_status = 'PUBLISHED'
    and d.published_at is not null
    and d.published_at <= now()
  limit 1;
$$;

revoke all on function public.get_published_sf_discovery(text) from public, anon, authenticated;
grant execute on function public.get_published_sf_discovery(text) to anon, authenticated;

create function public.get_sf_discovery_comments(p_discovery_id uuid)
returns table (
  id uuid,
  author_name text,
  body text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select recent.id, recent.author_name, recent.body, recent.created_at
  from (
    select c.id, c.author_name, c.body, c.created_at
    from public.sf_discovery_comments c
    join public.sf_discoveries d on d.id = c.discovery_id
    where c.discovery_id = p_discovery_id
      and c.status = 'PUBLIC'
      and d.publication_status = 'PUBLISHED'
      and d.published_at is not null
      and d.published_at <= now()
    order by c.created_at desc, c.id desc
    limit 100
  ) recent
  order by recent.created_at asc, recent.id asc;
$$;

revoke all on function public.get_sf_discovery_comments(uuid) from public, anon, authenticated;
grant execute on function public.get_sf_discovery_comments(uuid) to anon, authenticated;

create function public.create_sf_discovery_comment(
  p_discovery_id uuid,
  p_body text
)
returns table (
  id uuid,
  author_name text,
  body text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  normalized_body text := btrim(coalesce(p_body, ''));
  normalized_author_name text := left(coalesce(
    nullif(btrim(auth.jwt() -> 'user_metadata' ->> 'nickname'), ''),
    nullif(btrim(auth.jwt() -> 'user_metadata' ->> 'display_name'), ''),
    nullif(btrim(auth.jwt() -> 'user_metadata' ->> 'name'), ''),
    nullif(split_part(auth.jwt() ->> 'email', '@', 1), ''),
    '탐사자'
  ), 40);
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not (char_length(normalized_body) between 1 and 1000) then
    raise exception 'Comment body must contain 1 to 1000 characters' using errcode = '22023';
  end if;

  if normalized_author_name = '' then
    normalized_author_name := '탐사자';
  end if;

  if not exists (
    select 1
    from public.sf_discoveries d
    where d.id = p_discovery_id
      and d.publication_status = 'PUBLISHED'
      and d.published_at is not null
      and d.published_at <= now()
  ) then
    raise exception 'Published SF discovery not found' using errcode = 'P0002';
  end if;

  return query
  insert into public.sf_discovery_comments (
    discovery_id,
    user_id,
    author_name,
    body
  ) values (
    p_discovery_id,
    auth.uid(),
    normalized_author_name,
    normalized_body
  )
  returning
    sf_discovery_comments.id,
    sf_discovery_comments.author_name,
    sf_discovery_comments.body,
    sf_discovery_comments.created_at;
end;
$$;

revoke all on function public.create_sf_discovery_comment(uuid, text)
  from public, anon, authenticated;
grant execute on function public.create_sf_discovery_comment(uuid, text)
  to authenticated;
