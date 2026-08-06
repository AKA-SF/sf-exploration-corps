-- Keep the account nickname and public profile nickname atomic.
-- A failure in this trigger rolls the auth metadata update back in the same transaction.

create or replace function public.sync_profile_nickname_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_nickname text;
begin
  if new.raw_user_meta_data is not distinct from old.raw_user_meta_data then
    return new;
  end if;

  next_nickname := nullif(trim(coalesce(
    new.raw_user_meta_data ->> 'nickname',
    new.raw_user_meta_data ->> 'display_name',
    new.raw_user_meta_data ->> 'name'
  )), '');

  if next_nickname is null then
    return new;
  end if;

  next_nickname := regexp_replace(next_nickname, '\s+', ' ', 'g');
  if char_length(next_nickname) < 2 or char_length(next_nickname) > 24 then
    raise exception 'profile nickname must contain between 2 and 24 characters';
  end if;

  insert into public.profiles (id, nickname, public_code, updated_at)
  values (
    new.id,
    next_nickname,
    public.generate_profile_public_code(new.id),
    now()
  )
  on conflict (id) do update
  set nickname = excluded.nickname,
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_metadata_updated_profile on auth.users;
create trigger on_auth_user_metadata_updated_profile
  after update of raw_user_meta_data on auth.users
  for each row execute function public.sync_profile_nickname_from_auth();
