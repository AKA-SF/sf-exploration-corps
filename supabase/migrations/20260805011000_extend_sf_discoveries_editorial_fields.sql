-- 게시 상태를 명시적으로 확장하고 대표 이미지 접근성 정보를 공개 projection에 포함한다.

drop function if exists public.get_published_sf_discoveries(integer, integer, text, text);

alter table public.sf_discoveries
  add column if not exists publication_status text not null default 'DRAFT'
    check (publication_status in ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  add column if not exists image_alt text;

update public.sf_discoveries
set publication_status = case when is_published then 'PUBLISHED' else 'DRAFT' end;

alter table public.sf_discoveries drop column if exists is_published;

alter table public.sf_discoveries
  add constraint sf_discoveries_image_alt_check
  check (image_url is null or (image_alt is not null and char_length(btrim(image_alt)) between 1 and 240));

create index if not exists sf_discoveries_public_status_idx
  on public.sf_discoveries (publication_status, sort_priority desc, published_at desc)
  where publication_status = 'PUBLISHED';

create or replace function public.get_published_sf_discoveries(
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
  release_date date,
  source_name text,
  source_url text,
  image_url text,
  image_alt text,
  is_spoiler boolean,
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
    d.release_date,
    d.source_name,
    d.source_url,
    d.image_url,
    d.image_alt,
    d.is_spoiler,
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
