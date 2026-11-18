-- Veintiuno · Blackjack · © 2026 Elmo El Malcriado
-- Se puede ejecutar varias veces sin error.
-- ANTES de ejecutar: cambia TU_CORREO@gmail.com (aparece una sola vez abajo) por tu correo de Google.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  code text unique not null,
  chips bigint not null default 1000,
  credited bigint not null default 0,
  games int not null default 0,
  wins int not null default 0,
  best bigint not null default 1000,
  created_at timestamptz default now()
);
create table if not exists public.admins (email text primary key);

-- Administrador (borra el correo de ejemplo si quedó de una ejecución anterior)
delete from public.admins where email = 'josesalcedl818@gmail.com';
insert into public.admins (email) values ('josesalcedl818@gmail.com') on conflict do nothing;

alter table public.profiles enable row level security;
alter table public.admins enable row level security;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where lower(email) = lower(coalesce(auth.jwt()->>'email','')))
$$;

drop policy if exists "ver propio o admin" on public.profiles;
create policy "ver propio o admin" on public.profiles for select using (auth.uid() = id or public.is_admin());

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  loop
    c := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from profiles where code = c);
  end loop;
  insert into profiles (id, email, name, code)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)), c)
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.adjust_chips(p_delta bigint, p_game int default 0, p_win int default 0) returns bigint
language plpgsql security definer set search_path = public as $$
declare r bigint;
begin
  if auth.uid() is null then raise exception 'no autenticado'; end if;
  if abs(p_delta) > 1000000 then raise exception 'cantidad invalida'; end if;
  update profiles set chips = chips + p_delta, games = games + p_game, wins = wins + p_win,
         best = greatest(best, chips + p_delta)
   where id = auth.uid() and chips + p_delta >= 0 returning chips into r;
  if r is null then raise exception 'fichas insuficientes'; end if;
  return r;
end $$;

create or replace function public.admin_add_chips(p_id uuid, p_amount bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'solo administrador'; end if;
  update profiles set chips = greatest(0, chips + p_amount), credited = credited + p_amount,
         best = greatest(best, chips + p_amount) where id = p_id;
end $$;

revoke execute on function public.adjust_chips(bigint,int,int), public.admin_add_chips(uuid,bigint) from public, anon;
grant execute on function public.is_admin(), public.adjust_chips(bigint,int,int), public.admin_add_chips(uuid,bigint) to authenticated;

do $$ begin
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then null;
end $$;

-- Crea el perfil de quienes ya tenían cuenta antes de ejecutar este script
insert into public.profiles (id, email, name, code)
select u.id, u.email, coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email,'@',1)),
       upper(substr(md5(u.id::text), 1, 6))
from auth.users u where not exists (select 1 from public.profiles p where p.id = u.id);
