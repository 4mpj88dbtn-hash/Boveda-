-- Prueba de las reglas de acceso del perfil. Se corre con: npx supabase test db
begin;
select plan(8);

-- Dos cuentas de prueba (el disparador les crea su perfil).
insert into auth.users (id, email)
values
  ('11111111-1111-4111-8111-111111111111', 'duena@boveda.local'),
  ('22222222-2222-4222-8222-222222222222', 'otra@boveda.local');

select is(
  (select count(*) from public.profiles)::int,
  2,
  'Cada cuenta nueva recibe su perfil automáticamente'
);

-- Sesión con contraseña pero sin 2FA (aal1).
set local role authenticated;
set local request.jwt.claims to
  '{"sub": "11111111-1111-4111-8111-111111111111", "role": "authenticated", "aal": "aal1"}';

select is(
  (select count(*) from public.profiles)::int,
  0,
  'Sin 2FA no se ve ningún perfil'
);

select is_empty(
  $$ update public.profiles set display_name = 'Intruso'
     where id = '11111111-1111-4111-8111-111111111111' returning 1 $$,
  'Sin 2FA no se puede cambiar el perfil'
);

-- Sesión verificada con 2FA (aal2).
set local request.jwt.claims to
  '{"sub": "11111111-1111-4111-8111-111111111111", "role": "authenticated", "aal": "aal2"}';

select is(
  (select count(*) from public.profiles)::int,
  1,
  'Con 2FA la dueña ve solo su propio perfil'
);

select isnt_empty(
  $$ update public.profiles set display_name = 'Ana'
     where id = '11111111-1111-4111-8111-111111111111' returning 1 $$,
  'Con 2FA la dueña cambia el nombre de su saludo'
);

select is_empty(
  $$ update public.profiles set display_name = 'Intruso'
     where id = '22222222-2222-4222-8222-222222222222' returning 1 $$,
  'Nadie puede cambiar el perfil de otra cuenta'
);

select throws_ok(
  $$ update public.profiles set base_currency = 'USD'
     where id = '11111111-1111-4111-8111-111111111111' $$,
  '42501',
  null,
  'Desde la app solo se puede cambiar el nombre del saludo'
);

-- Visitante sin sesión.
set local role anon;
set local request.jwt.claims to '{"role": "anon"}';

select throws_ok(
  $$ select * from public.profiles $$,
  '42501',
  null,
  'Un visitante sin sesión no tiene acceso a la tabla'
);

select * from finish();
rollback;
