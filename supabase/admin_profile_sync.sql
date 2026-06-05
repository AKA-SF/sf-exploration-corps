-- 관리자 등급이 실제 프로필/홈페이지 화면에 유지되도록 동기화합니다.
-- Supabase Dashboard > SQL Editor에서 실행할 수 있는 보정 SQL입니다.

alter table public.profiles
  add column if not exists title_override text;

create or replace function public.profile_rank_title(points integer)
returns text
language sql
immutable
as $$
  select case
    when greatest(0, coalesce(points, 0)) >= 4500 then '포스트휴먼'
    when greatest(0, coalesce(points, 0)) >= 3200 then '심우주 사령관'
    when greatest(0, coalesce(points, 0)) >= 2300 then '함장'
    when greatest(0, coalesce(points, 0)) >= 1600 then '부함장'
    when greatest(0, coalesce(points, 0)) >= 1100 then '선임 항해사'
    when greatest(0, coalesce(points, 0)) >= 700 then '항해사'
    when greatest(0, coalesce(points, 0)) >= 400 then '분석사'
    when greatest(0, coalesce(points, 0)) >= 220 then '연구원'
    when greatest(0, coalesce(points, 0)) >= 100 then '탐사대원'
    when greatest(0, coalesce(points, 0)) >= 30 then '수습 대원'
    else '탐사보조원'
  end;
$$;

update public.profiles
set title_override = title
where nullif(trim(coalesce(title_override, '')), '') is null
  and nullif(trim(coalesce(title, '')), '') is not null
  and title is distinct from public.profile_rank_title(mileage);

update public.profiles
set title = coalesce(nullif(trim(title_override), ''), public.profile_rank_title(mileage)),
    updated_at = now();

create or replace function public.update_profile_mileage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_mileage integer;
begin
  update public.profiles
  set mileage = greatest(0, mileage + new.points),
      title = coalesce(nullif(trim(title_override), ''), public.profile_rank_title(greatest(0, mileage + new.points))),
      updated_at = now()
  where id = new.user_id
  returning mileage into next_mileage;

  return new;
end;
$$;

create or replace function public.admin_set_member_title(
  target_user_id uuid,
  next_title text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_user_is_admin() then
    raise exception 'admin role is required';
  end if;

  if target_user_id is null or nullif(trim(next_title), '') is null then
    raise exception 'target user and title are required';
  end if;

  update public.profiles
  set title = trim(next_title),
      title_override = trim(next_title),
      updated_at = now()
  where id = target_user_id;

  perform public.admin_record_action(
    'member_title_update',
    'profile',
    target_user_id::text,
    trim(next_title),
    jsonb_build_object('title_override', true)
  );
end;
$$;

grant execute on function public.profile_rank_title(integer) to anon, authenticated;
grant execute on function public.admin_set_member_title(uuid, text) to authenticated;
