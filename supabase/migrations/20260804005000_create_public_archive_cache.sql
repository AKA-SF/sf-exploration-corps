create table if not exists public.public_archive_cache (
  cache_key text primary key,
  payload jsonb not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.public_archive_cache enable row level security;

drop trigger if exists public_archive_cache_touch_updated_at on public.public_archive_cache;

drop function if exists public.touch_public_archive_cache_updated_at();

create function public.touch_public_archive_cache_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger public_archive_cache_touch_updated_at
before update on public.public_archive_cache
for each row
execute function public.touch_public_archive_cache_updated_at();

revoke all on public.public_archive_cache from anon, authenticated;

comment on table public.public_archive_cache is
  'Server-only snapshots for public Notion archive responses. Accessed by Vercel API routes with the service role key.';
