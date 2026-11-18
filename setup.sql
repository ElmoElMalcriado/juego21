-- Pega todo esto en Supabase > SQL Editor > Run.
-- Antes de ejecutar, cambia TU_CORREO@gmail.com por el correo de Google del administrador.

create table public.profiles (
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
create table public.admins (email text primary key);
insert into public.admins values ('Josesalcedl818@gmail.com');

alter table public.profiles enable row level security;
alter table public.admins enable row level security;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where lower(email) = lower(coalesce(auth.jwt()->>'email','')))
$$;

-- Cada jugador ve solo su fila; el admin ve todas. Nadie escribe directo: solo por las funciones de abajo.
create policy "ver propio o admin" on public.profiles for select using (auth.uid() = id or public.is_admin());

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  loop
    c := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from profiles where code = c);
  end loop;
  insert into profiles (id, email, name, code)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)), c);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.adjust_chips(p_delta bigint, p_game int default 0, p_win int default 0) returns bigint
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

create function public.admin_add_chips(p_id uuid, p_amount bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'solo administrador'; end if;
  update profiles set chips = greatest(0, chips + p_amount), credited = credited + p_amount,
         best = greatest(best, chips + p_amount) where id = p_id;
end $$;

revoke execute on function public.adjust_chips(bigint,int,int), public.admin_add_chips(uuid,bigint) from public, anon;
grant execute on function public.is_admin(), public.adjust_chips(bigint,int,int), public.admin_add_chips(uuid,bigint) to authenticated;

alter publication supabase_realtime add table public.profiles;
