-- 기존 trigger를 publication_status 기반 함수에 명시적으로 재연결하고 실제 상태 전환을 검증한다.

drop trigger if exists touch_sf_discovery_updated_at on public.sf_discoveries;

create or replace function public.touch_sf_discovery_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();

  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    if new.publication_status = 'PUBLISHED' then
      new.published_at := coalesce(new.published_at, now());
    else
      new.published_at := null;
    end if;
    return new;
  end if;

  if new.publication_status = 'PUBLISHED' then
    if old.publication_status <> 'PUBLISHED' or new.published_at is null then
      new.published_at := coalesce(new.published_at, now());
    end if;
  else
    new.published_at := null;
  end if;

  return new;
end;
$$;

create trigger touch_sf_discovery_updated_at
before insert or update on public.sf_discoveries
for each row execute function public.touch_sf_discovery_updated_at();

drop function if exists public.set_sf_discovery_updated_at();

-- 이 블록은 migration transaction 안에서 trigger의 실제 draft → publish → archive → delete
-- lifecycle을 실행한다. 검증용 행은 public RPC에 노출되기 전에 같은 transaction에서 삭제된다.
do $$
declare
  smoke_id uuid;
  smoke_published_at timestamptz;
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
    'SF discovery trigger smoke check',
    'sf-discovery-trigger-smoke-check',
    'NEW_RELEASE',
    'OTHER',
    'Migration-only lifecycle verification row.',
    'Internal migration check',
    'https://example.com/sf-discovery-trigger-smoke-check',
    'DRAFT'
  )
  returning id into smoke_id;

  update public.sf_discoveries
  set publication_status = 'PUBLISHED'
  where id = smoke_id
  returning published_at into smoke_published_at;

  if smoke_published_at is null then
    raise exception 'SF discovery publish transition did not set published_at';
  end if;

  update public.sf_discoveries
  set publication_status = 'ARCHIVED'
  where id = smoke_id
  returning published_at into smoke_published_at;

  if smoke_published_at is not null then
    raise exception 'SF discovery archive transition did not clear published_at';
  end if;

  delete from public.sf_discoveries where id = smoke_id;
end;
$$;
