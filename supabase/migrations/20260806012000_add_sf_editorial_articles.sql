-- 장문 편집 추천의 작업 단계, 구조화 본문, 검증된 발행 경계를 추가한다.

alter table public.sf_discoveries
  add column if not exists editorial_payload jsonb,
  add column if not exists editorial_stage text not null default 'NONE'
    check (editorial_stage in ('NONE', 'SELECTION_APPROVED', 'DRAFTING', 'REVIEW_READY', 'APPROVED')),
  add column if not exists selection_approved_at timestamptz,
  add column if not exists selection_approval_ref text,
  add column if not exists published_by uuid references auth.users(id) on delete set null;

create or replace function public.sf_editorial_payload_is_valid(p_payload jsonb)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select
    jsonb_typeof(p_payload) = 'object'
    and nullif(btrim(p_payload ->> 'theme'), '') is not null
    and nullif(btrim(p_payload ->> 'deck'), '') is not null
    and nullif(btrim(p_payload ->> 'intro'), '') is not null
    and nullif(btrim(p_payload ->> 'closing'), '') is not null
    and jsonb_typeof(p_payload -> 'books') = 'array'
    and jsonb_array_length(p_payload -> 'books') = 3
    and (select count(distinct book ->> 'isbn13') from jsonb_array_elements(p_payload -> 'books') as book) = 3
    and not exists (
      select 1
      from jsonb_array_elements(p_payload -> 'books') as book
      where nullif(btrim(book ->> 'title'), '') is null
        or nullif(btrim(book ->> 'author'), '') is null
        or nullif(btrim(book ->> 'translator'), '') is null
        or coalesce(book ->> 'isbn13', '') !~ '^[0-9]{13}$'
        or nullif(btrim(book ->> 'synopsis'), '') is null
        or nullif(btrim(book ->> 'standing'), '') is null
        or nullif(btrim(book ->> 'reason'), '') is null
        or coalesce(book #>> '{cover,url}', '') !~ '^https://'
        or nullif(btrim(book #>> '{cover,alt}'), '') is null
        or coalesce(book #>> '{cover,source_url}', '') !~ '^https://'
        or coalesce(book #>> '{cover,rights_status}', '') not in ('APPROVED', 'API_LICENSED')
        or nullif(btrim(book #>> '{cover,rights_note}'), '') is null
    )
    and jsonb_typeof(p_payload -> 'sources') = 'array'
    and jsonb_array_length(p_payload -> 'sources') >= 3
    and (select count(distinct source ->> 'url') from jsonb_array_elements(p_payload -> 'sources') as source)
      = jsonb_array_length(p_payload -> 'sources')
    and not exists (
      select 1
      from jsonb_array_elements(p_payload -> 'sources') as source
      where nullif(btrim(source ->> 'label'), '') is null
        or coalesce(source ->> 'url', '') !~ '^https://'
    );
$$;

alter table public.sf_discoveries
  drop constraint if exists sf_discoveries_editorial_approved_check;
alter table public.sf_discoveries
  add constraint sf_discoveries_editorial_approved_check
  check (
    editorial_stage <> 'APPROVED'
    or (
      kind = 'EDITOR_PICK'
      and selection_approved_at is not null
      and nullif(btrim(selection_approval_ref), '') is not null
      and public.sf_editorial_payload_is_valid(editorial_payload)
    )
  );

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

  if tg_op = 'UPDATE'
    and old.publication_status = 'PUBLISHED'
    and new.publication_status = 'PUBLISHED'
    and coalesce(current_setting('app.sf_publish_guard', true), '') <> 'allowed'
  then
    raise exception 'Published SF discoveries are immutable; archive and review before republishing';
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

create or replace function public.publish_sf_discovery(
  p_id uuid,
  p_expected_updated_at timestamptz
)
returns setof public.sf_discoveries
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target public.sf_discoveries;
begin
  if not public.current_user_is_admin() then
    raise exception 'Administrator role required';
  end if;

  select * into target
  from public.sf_discoveries
  where id = p_id
  for update;

  if target.id is null then
    raise exception 'SF discovery not found';
  end if;

  if p_expected_updated_at is null
    or target.updated_at is distinct from p_expected_updated_at
  then
    raise exception 'SF discovery changed; reload before publishing';
  end if;

  if target.publication_status = 'PUBLISHED' then
    raise exception 'SF discovery is already published';
  end if;

  if target.kind = 'EDITOR_PICK' then
    if target.editorial_stage <> 'APPROVED' then
      raise exception 'Editorial review must be approved before publishing';
    end if;
    if not public.sf_editorial_payload_is_valid(target.editorial_payload) then
      raise exception 'Editorial payload is incomplete';
    end if;
  end if;

  perform set_config('app.sf_publish_guard', 'allowed', true);

  update public.sf_discoveries
  set publication_status = 'PUBLISHED',
      published_at = now(),
      published_by = auth.uid()
  where id = p_id
  returning * into target;

  perform set_config('app.sf_publish_guard', '', true);
  return next target;
end;
$$;

revoke all on function public.publish_sf_discovery(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.publish_sf_discovery(uuid, timestamptz) to authenticated;

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
    d.release_date,
    d.source_name,
    d.source_url,
    d.image_url,
    d.image_alt,
    d.is_spoiler,
    d.editorial_payload is not null,
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
    and d.publication_status = 'PUBLISHED'
    and d.published_at is not null
    and d.published_at <= now()
  limit 1;
$$;

revoke all on function public.get_published_sf_discovery(text) from public, anon, authenticated;
grant execute on function public.get_published_sf_discovery(text) to anon, authenticated;
