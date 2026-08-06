-- 게시된 항목의 일반 콘텐츠 수정은 허용하되 편집 추천 workflow 변경은
-- 명시적인 비공개 전환과 재승인·최종 발행 절차를 거치도록 강제한다.

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
    and (
      new.kind is distinct from old.kind
      or new.editorial_stage is distinct from old.editorial_stage
      or new.editorial_payload is distinct from old.editorial_payload
      or new.selection_approval_ref is distinct from old.selection_approval_ref
      or new.selection_approved_at is distinct from old.selection_approved_at
    )
  then
    raise exception 'Published editorial workflow changes require an explicit non-public transition';
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

-- 고정 slug에 의존하지 않는 실제 trigger smoke test.
do $$
declare
  smoke_id uuid;
  smoke_slug text := 'published-editorial-guard-' || replace(gen_random_uuid()::text, '-', '');
  guard_rejected boolean := false;
begin
  insert into public.sf_discoveries (
    title, slug, kind, media_type, summary, source_name, source_url, publication_status
  ) values (
    'Published editorial workflow guard smoke check',
    smoke_slug,
    'NEW_RELEASE',
    'OTHER',
    'Migration-only draft verification.',
    'Internal migration check',
    'https://example.com/published-editorial-workflow-guard',
    'DRAFT'
  ) returning id into smoke_id;

  perform set_config('app.sf_publish_guard', 'allowed', true);
  update public.sf_discoveries
  set publication_status = 'PUBLISHED', published_at = now()
  where id = smoke_id;
  perform set_config('app.sf_publish_guard', '', true);

  update public.sf_discoveries
  set summary = 'Published general edits remain allowed.'
  where id = smoke_id;

  begin
    update public.sf_discoveries
    set kind = 'EDITOR_PICK', editorial_stage = 'DRAFTING'
    where id = smoke_id;
  exception when others then
    guard_rejected := true;
  end;

  if not guard_rejected then
    raise exception 'published editorial workflow guard did not reject the update';
  end if;

  delete from public.sf_discoveries where id = smoke_id;
end;
$$;
