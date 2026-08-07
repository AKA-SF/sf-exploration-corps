-- Harden community authorship and attachment URL writes without changing existing rows.

create or replace function public.set_trusted_community_author_name()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  trusted_author_name text := left(coalesce(
    nullif(btrim(auth.jwt() -> 'user_metadata' ->> 'nickname'), ''),
    nullif(btrim(auth.jwt() -> 'user_metadata' ->> 'display_name'), ''),
    nullif(btrim(auth.jwt() -> 'user_metadata' ->> 'name'), ''),
    nullif(split_part(auth.jwt() ->> 'email', '@', 1), ''),
    '탐사자'
  ), 40);
begin
  if auth.uid() is null then
    if auth.role() = 'service_role' then
      new.author_name := left(coalesce(nullif(btrim(new.author_name), ''), '탐사자'), 40);
      return new;
    end if;
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  new.author_name := coalesce(nullif(trusted_author_name, ''), '탐사자');
  return new;
end;
$$;

revoke all on function public.set_trusted_community_author_name()
  from public, anon, authenticated;

drop trigger if exists community_posts_set_trusted_author_name
  on public.community_posts;
create trigger community_posts_set_trusted_author_name
  before insert on public.community_posts
  for each row execute function public.set_trusted_community_author_name();

drop trigger if exists community_posts_protect_author_name
  on public.community_posts;
create trigger community_posts_protect_author_name
  before update of author_name on public.community_posts
  for each row execute function public.set_trusted_community_author_name();

drop trigger if exists community_comments_set_trusted_author_name
  on public.community_comments;
create trigger community_comments_set_trusted_author_name
  before insert on public.community_comments
  for each row execute function public.set_trusted_community_author_name();

drop trigger if exists community_comments_protect_author_name
  on public.community_comments;
create trigger community_comments_protect_author_name
  before update of author_name on public.community_comments
  for each row execute function public.set_trusted_community_author_name();

alter table public.community_posts
  drop constraint if exists community_posts_attachment_url_http;
alter table public.community_posts
  add constraint community_posts_attachment_url_http
  check (
    attachment_url is null
    or attachment_url ~* '^https?://[^[:space:]]+$'
  ) not valid;
