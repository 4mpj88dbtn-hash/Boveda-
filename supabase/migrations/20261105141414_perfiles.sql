-- Fase 0: perfil del usuario y reglas de acceso.
--
-- Regla para toda tabla con datos del usuario:
--   1. Una política RESTRICTIVA exige sesión verificada con 2FA (nivel aal2).
--   2. Políticas permisivas dejan al dueño ver o cambiar solo lo suyo.
-- Sin el código 2FA no se ve ningún dato, aunque la contraseña sea correcta.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (
    display_name is null or char_length(btrim(display_name)) between 1 and 40
  ),
  time_zone text not null default 'America/Cancun',
  base_currency text not null default 'MXN' check (base_currency in ('MXN', 'USD')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Ajustes del usuario: nombre para el saludo, zona horaria y moneda principal.';

alter table public.profiles enable row level security;

create policy "profiles: exige 2FA"
  on public.profiles
  as restrictive
  for all
  to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2')
  with check ((select auth.jwt() ->> 'aal') = 'aal2');

create policy "profiles: el dueño lee su perfil"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles: el dueño actualiza su perfil"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Permisos de tabla: el perfil se lee y solo se puede cambiar el nombre del saludo.
-- Se crea con un disparador y no se borra desde la app.
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name) on table public.profiles to authenticated;

-- Fecha de última modificación automática.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- El perfil se crea solo al crear la cuenta.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
