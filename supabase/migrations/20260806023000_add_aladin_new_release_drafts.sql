-- Aladin SF 신간을 공개 불가능한 DRAFT로만 적재하는 server-only 계약.

alter table public.sf_discoveries
  add column if not exists source_provider text,
  add column if not exists source_external_id text,
  add column if not exists isbn13 text,
  add column if not exists author_text text,
  add column if not exists publisher_text text,
  add column if not exists cover_rights_status text,
  add column if not exists source_snapshot jsonb,
  add column if not exists automation_first_seen_at timestamptz,
  add column if not exists automation_last_seen_at timestamptz;

alter table public.sf_discoveries
  drop constraint if exists sf_discoveries_source_provider_check;
alter table public.sf_discoveries
  add constraint sf_discoveries_source_provider_check
  check (source_provider is null or source_provider in ('ALADIN'));

alter table public.sf_discoveries
  drop constraint if exists sf_discoveries_source_identity_check;
alter table public.sf_discoveries
  add constraint sf_discoveries_source_identity_check
  check ((source_provider is null) = (source_external_id is null));

alter table public.sf_discoveries
  drop constraint if exists sf_discoveries_isbn13_check;
alter table public.sf_discoveries
  add constraint sf_discoveries_isbn13_check
  check (isbn13 is null or isbn13 ~ '^[0-9]{13}$');

alter table public.sf_discoveries
  drop constraint if exists sf_discoveries_cover_rights_status_check;
alter table public.sf_discoveries
  add constraint sf_discoveries_cover_rights_status_check
  check (cover_rights_status is null or cover_rights_status in ('UNVERIFIED', 'APPROVED', 'API_LICENSED'));

alter table public.sf_discoveries
  drop constraint if exists sf_discoveries_source_unique;
alter table public.sf_discoveries
  add constraint sf_discoveries_source_unique unique (source_provider, source_external_id);

create index if not exists sf_discoveries_isbn13_idx
  on public.sf_discoveries (isbn13)
  where isbn13 is not null;

create or replace function public.import_aladin_sf_discovery_drafts(p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  item jsonb;
  inserted_count integer := 0;
  duplicate_count integer := 0;
  affected_rows integer;
  external_id text;
  normalized_isbn text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;

  if jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) < 1
    or jsonb_array_length(p_items) > 50
  then
    raise exception 'Aladin import requires 1 to 50 items';
  end if;

  -- Admin 수동 실행과 cron이 겹쳐도 dedupe 조회와 insert를 한 번에 직렬화한다.
  perform pg_advisory_xact_lock(20260806023000);

  for item in select value from jsonb_array_elements(p_items)
  loop
    external_id := nullif(btrim(item ->> 'source_external_id'), '');
    normalized_isbn := nullif(btrim(item ->> 'isbn13'), '');

    if item ->> 'source_provider' <> 'ALADIN'
      or external_id is null
      or nullif(btrim(item ->> 'title'), '') is null
      or nullif(btrim(item ->> 'author_text'), '') is null
      or nullif(btrim(item ->> 'publisher_text'), '') is null
      or nullif(btrim(item ->> 'summary'), '') is null
      or coalesce(item ->> 'kind', '') not in ('NEW_RELEASE', 'UPCOMING')
      or item ->> 'cover_rights_status' <> 'UNVERIFIED'
      or coalesce(item ->> 'source_url', '') !~ '^https://'
      or coalesce(item ->> 'release_date', '') !~ '^\d{4}-\d{2}-\d{2}$'
      or (normalized_isbn is not null and normalized_isbn !~ '^[0-9]{13}$')
    then
      raise exception 'Invalid Aladin draft payload';
    end if;

    if exists (
      select 1
      from public.sf_discoveries d
      where (d.source_provider = 'ALADIN' and d.source_external_id = external_id)
        or (normalized_isbn is not null and d.isbn13 = normalized_isbn)
        or d.source_url = item ->> 'source_url'
        or (
          lower(btrim(d.title)) = lower(btrim(item ->> 'title'))
          and d.release_date = (item ->> 'release_date')::date
        )
    ) then
      duplicate_count := duplicate_count + 1;
      continue;
    end if;

    insert into public.sf_discoveries (
      slug,
      title,
      kind,
      media_type,
      summary,
      source_name,
      source_url,
      image_url,
      image_alt,
      release_date,
      publication_status,
      published_at,
      internal_notes,
      source_provider,
      source_external_id,
      isbn13,
      author_text,
      publisher_text,
      cover_rights_status,
      source_snapshot,
      automation_first_seen_at,
      automation_last_seen_at
    ) values (
      'aladin-' || external_id,
      btrim(item ->> 'title'),
      item ->> 'kind',
      'NOVEL',
      left(btrim(item ->> 'summary'), 500),
      '알라딘 SF 신간 API',
      item ->> 'source_url',
      nullif(item ->> 'image_url', ''),
      nullif(btrim(item ->> 'image_alt'), ''),
      (item ->> 'release_date')::date,
      'DRAFT',
      null,
      format('자동 조사 초안 · 저자: %s · 출판사: %s · ISBN13: %s',
        item ->> 'author_text', item ->> 'publisher_text', coalesce(normalized_isbn, '검토 필요')),
      'ALADIN',
      external_id,
      normalized_isbn,
      btrim(item ->> 'author_text'),
      btrim(item ->> 'publisher_text'),
      'UNVERIFIED',
      item -> 'source_snapshot',
      (item ->> 'automation_first_seen_at')::timestamptz,
      (item ->> 'automation_last_seen_at')::timestamptz
    )
    on conflict (source_provider, source_external_id) do nothing;

    get diagnostics affected_rows = row_count;
    if affected_rows = 1 then
      inserted_count := inserted_count + 1;
    else
      duplicate_count := duplicate_count + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'created', inserted_count,
    'duplicates', duplicate_count,
    'received', jsonb_array_length(p_items)
  );
end;
$$;

revoke all on function public.import_aladin_sf_discovery_drafts(jsonb)
  from public, anon, authenticated;
grant execute on function public.import_aladin_sf_discovery_drafts(jsonb)
  to service_role;
