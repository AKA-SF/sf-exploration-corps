-- publication_status 전환에 맞춰 published_at과 updated_at을 일관되게 유지한다.

create or replace function public.set_sf_discovery_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();

  if tg_op = 'INSERT' then
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
