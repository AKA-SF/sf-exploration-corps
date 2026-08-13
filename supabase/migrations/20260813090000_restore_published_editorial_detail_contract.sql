-- Restore the approved editorial-only contract after the discussion migration
-- recreated get_published_sf_discovery without its workflow predicates.
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
    and d.kind = 'EDITOR_PICK'
    and d.editorial_stage = 'APPROVED'
    and public.sf_editorial_payload_is_valid(d.editorial_payload)
    and d.publication_status = 'PUBLISHED'
    and d.published_at is not null
    and d.published_at <= now()
  limit 1;
$$;

revoke all on function public.get_published_sf_discovery(text) from public, anon, authenticated;
grant execute on function public.get_published_sf_discovery(text) to anon, authenticated;
