-- 게시된 SF 항목의 일반 콘텐츠 편집은 게시 상태와 발행 시각을 보존한다.
-- DRAFT/ARCHIVED -> PUBLISHED 전환은 계속 publish_sf_discovery()로만 허용한다.

create or replace function public.touch_sf_discovery_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT'
    and new.publication_status = 'PUBLISHED'
    and coalesce(current_setting('app.sf_publish_guard', true), '') <> 'allowed'
  then
    raise exception 'SF discoveries must be published through publish_sf_discovery()';
  end if;

  if tg_op = 'UPDATE'
    and new.publication_status = 'PUBLISHED'
    and old.publication_status <> 'PUBLISHED'
    and coalesce(current_setting('app.sf_publish_guard', true), '') <> 'allowed'
  then
    raise exception 'SF discoveries must be published through publish_sf_discovery()';
  end if;

  new.updated_at := now();
  new.updated_by := auth.uid();

  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
  end if;

  if new.publication_status = 'PUBLISHED' then
    new.published_at := coalesce(new.published_at, now());
  else
    new.published_at := null;
  end if;

  return new;
end;
$$;

-- 상세 route는 검수·승인된 편집 추천만 반환한다.
create or replace function public.get_published_sf_discovery(p_slug text)
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

-- migration transaction 안에서 실제 게시 항목의 일반 편집 수명주기를 검증한다.
do $$
declare
  smoke_id uuid;
  original_published_at timestamptz;
  edited_published_at timestamptz;
  edited_status text;
begin
  insert into public.sf_discoveries (
    title,
    slug,
    kind,
    media_type,
    summary,
    source_name,
    source_url,
    publication_status
  ) values (
    'Published SF discovery edit smoke check',
    'published-sf-discovery-edit-smoke-check',
    'NEW_RELEASE',
    'OTHER',
    'Migration-only draft verification.',
    'Internal migration check',
    'https://example.com/published-sf-discovery-edit-smoke-check',
    'DRAFT'
  )
  returning id into smoke_id;

  perform set_config('app.sf_publish_guard', 'allowed', true);
  update public.sf_discoveries
  set publication_status = 'PUBLISHED',
      published_at = now()
  where id = smoke_id
  returning published_at into original_published_at;
  perform set_config('app.sf_publish_guard', '', true);

  update public.sf_discoveries
  set summary = 'Migration-only published edit verification.'
  where id = smoke_id
  returning publication_status, published_at
  into edited_status, edited_published_at;

  if edited_status is distinct from 'PUBLISHED' then
    raise exception 'published edit changed publication_status';
  end if;

  if edited_published_at is distinct from original_published_at then
    raise exception 'published edit changed published_at';
  end if;

  delete from public.sf_discoveries where id = smoke_id;
end;
$$;
