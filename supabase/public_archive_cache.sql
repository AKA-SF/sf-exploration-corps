create table if not exists public.public_archive_cache (
  cache_key text primary key,
  payload jsonb not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.public_archive_cache enable row level security;

drop trigger if exists public_archive_cache_touch_updated_at on public.public_archive_cache;

create or replace function public.touch_public_archive_cache_updated_at()
returns trigger
language plpgsql
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
  'Optional server-side cache for public Notion archive API responses. Accessed only by Vercel API routes using the service role key.';
