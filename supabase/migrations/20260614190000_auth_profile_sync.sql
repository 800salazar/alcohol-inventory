-- Mantiene `public.profiles` sincronizado con `auth.users` y corrige usuarios
-- existentes que pudieron haberse creado antes del trigger inicial.

create or replace function public.upsert_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, active)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'OPERATOR'),
    true
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(public.profiles.full_name, excluded.full_name),
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.upsert_auth_user_profile();

drop trigger if exists on_auth_user_updated on auth.users;

create trigger on_auth_user_updated
  after update of email, raw_user_meta_data on auth.users
  for each row execute function public.upsert_auth_user_profile();

insert into public.profiles (id, email, full_name, role, active)
select
  au.id,
  au.email,
  nullif(au.raw_user_meta_data ->> 'full_name', ''),
  coalesce((au.raw_user_meta_data ->> 'role')::public.user_role, 'OPERATOR'),
  true
from auth.users au
left join public.profiles p on p.id = au.id
where p.id is null;

update public.profiles p
set email = au.email,
    updated_at = now()
from auth.users au
where au.id = p.id
  and p.email is distinct from au.email;
