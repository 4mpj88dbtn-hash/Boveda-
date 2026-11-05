# Bóveda

App personal de finanzas, inversión y mercados, instalable en celular y computadora (PWA).
Se construye por fases; el avance está en [`ROADMAP.md`](ROADMAP.md).

> Información educativa. No es asesoría financiera.

**Estado:** Fase 0 lista para probar: diseño, navegación, inicio de sesión con 2FA obligatorio e instalación como app. Las secciones muestran qué llega en cada fase.

## Documentación

- Reglas del proyecto: [`CLAUDE.md`](CLAUDE.md)
- Fases y avance: [`ROADMAP.md`](ROADMAP.md)
- Arquitectura: [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md)
- Diseño: [`docs/DISENO.md`](docs/DISENO.md)
- Prompt maestro original: [`docs/SPEC.pdf`](docs/SPEC.pdf)

## Qué claves necesita

| Variable | Dónde se usa | De dónde sale |
|---|---|---|
| `SUPABASE_URL` | Vercel y tu computadora | Supabase → tu proyecto → Project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Vercel y tu computadora | Supabase → Project Settings → API Keys → Publishable key |
| `SUPABASE_SECRET_KEY` | Solo pruebas en tu computadora | La da la base local (`npx supabase status`). Nunca la pongas en Vercel |

Secretos de GitHub (para aplicar los cambios de la base de datos automáticamente):

| Secreto | De dónde sale |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | Supabase → tu cuenta → Access Tokens → Generate new token |
| `SUPABASE_PROJECT_ID` | Supabase → Project Settings → General → Project ID |
| `SUPABASE_DB_PASSWORD` | La contraseña de la base que elegiste al crear el proyecto |

Nunca pegues claves secretas en un chat ni en el código. La plantilla está en [`.env.example`](.env.example).

## Publicar la app (una sola vez)

Los nombres de los menús de Supabase y Vercel pueden cambiar un poco con el tiempo.

### 1. Supabase (base de datos y login)

1. Entra a [supabase.com](https://supabase.com) e inicia sesión con tu cuenta de GitHub.
2. Crea un proyecto: nombre `boveda`, región **East US (North Virginia)** y plan Free. Genera la contraseña de la base y guárdala en tu gestor de contraseñas.
3. En **Authentication → Sign In / Providers**, desactiva **Allow new users to sign up**. Así nadie más puede crear cuenta.
4. En **Authentication → Users → Add user → Create new user**, crea tu cuenta con tu correo y una contraseña de al menos 12 caracteres con mayúsculas, minúsculas y números. Marca **Auto Confirm User**.
5. Revisa que en **Authentication → Multi-Factor** esté activo **TOTP (App Authenticator)**. Viene activo y es gratis.
6. Copia la **Project URL**, la **Publishable key** y el **Project ID** (ver la tabla de arriba).

### 2. GitHub (cambios automáticos de la base)

1. En Supabase, genera un **Access Token** (ver la tabla de arriba).
2. En GitHub, abre este repositorio → **Settings → Secrets and variables → Actions → New repository secret** y crea los tres secretos: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID` y `SUPABASE_DB_PASSWORD`.
3. Cada vez que un cambio de la base llegue a `main`, GitHub lo aplica solo (flujo **Migraciones**). También puedes correrlo a mano en **Actions → Migraciones → Run workflow**.

### 3. Vercel (publicación)

1. Entra a [vercel.com](https://vercel.com) con tu cuenta de GitHub y elige **Add New → Project → Import** el repositorio `Boveda-`.
2. Antes de publicar, en **Environment Variables** agrega `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` para **Production** y **Preview**.
3. Publica. Cada rama (`fase-0`, `fase-1`…) tendrá su enlace de vista previa, y `main` será tu dirección principal.

### 4. Primer ingreso

1. Abre tu dirección de Vercel en el celular y entra con tu correo y contraseña.
2. La app te pide activar el 2FA: toca **Agregar en este celular** (o escribe la clave a mano en tu app autenticadora) y luego escribe el código de 6 dígitos.
3. Instala la app: en iPhone, Safari → Compartir → **Agregar a inicio**; en Android, Chrome → menú ⋮ → **Instalar app**.

## Si algo sale mal

- **Olvidé mi contraseña.** En Supabase abre **SQL Editor** y ejecuta esto con tu correo y tu nueva contraseña:

  ```sql
  update auth.users
  set encrypted_password = extensions.crypt('TU-NUEVA-CONTRASEÑA', extensions.gen_salt('bf'))
  where email = 'tu@correo.com';
  ```

- **Perdí el celular donde tenía el 2FA.** En Supabase, **Authentication → Users**, abre tu usuario y borra su factor MFA. Si no ves la opción, ejecuta en **SQL Editor**:

  ```sql
  delete from auth.mfa_factors
  where user_id = (select id from auth.users where email = 'tu@correo.com');
  ```

  La próxima vez que entres, la app te pedirá activar el 2FA de nuevo.

- **La app dice que el proyecto no responde.** El plan gratuito de Supabase pausa el proyecto tras 7 días con poca actividad. Entra al panel de Supabase y reactívalo.

## Correrla en tu computadora

Necesitas [Node.js 22](https://nodejs.org) y [Docker Desktop](https://www.docker.com/products/docker-desktop/) abierto.

```bash
npm install            # instala las dependencias (una vez)
npm run db:start       # levanta la base local en Docker (la primera vez tarda unos minutos)
npx supabase status    # muestra la URL y las claves locales
```

Copia `.env.example` como `.env.local` y llena `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_SECRET_KEY` con los valores locales. Luego crea tu usuario local y abre la app:

```bash
npm run db:usuario -- tu@correo.com "Una-Contrasena-Larga-123"
npm run dev            # abre http://localhost:3000
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | App en modo desarrollo |
| `npm run build` / `npm start` | Compila y corre la versión de producción |
| `npm run check` | Estilo, tipos y pruebas unitarias |
| `npm test` | Pruebas unitarias (fórmulas, dinero y fechas) |
| `npm run test:db` | Pruebas de las reglas de acceso de la base (requiere la base local) |
| `npm run test:e2e` | Flujo completo en un navegador: login con 2FA, saludo y salida |
| `npm run db:start` / `db:stop` | Enciende o apaga la base local |
| `npm run db:reset` | Borra la base local y aplica todas las migraciones desde cero |
| `npm run db:usuario -- correo contraseña` | Crea un usuario en la base local |
| `npm run db:types` | Actualiza los tipos de TypeScript a partir de la base local |

## Cómo está organizado

```
src/app/            pantallas (las direcciones van en español: /finanzas, /mercados…)
src/modules/        lógica por área (perfil, Centro de mando; luego finanzas, mercados…)
src/components/     componentes de interfaz y navegación
src/lib/            dinero, fechas, configuración, Supabase e inicio de sesión
supabase/           configuración, migraciones y pruebas de la base
tests/e2e/          pruebas de flujo completo
public/sw.js        service worker (instalación y pantalla sin conexión)
```

## Seguridad

- Inicio de sesión con contraseña y código 2FA obligatorio; sin 2FA la base no entrega ningún dato (reglas de acceso probadas en `supabase/tests`).
- El navegador nunca habla directo con Supabase ni con APIs con claves: todo pasa por el servidor de la app.
- El service worker solo guarda archivos estáticos y la pantalla sin conexión, nunca páginas con tus datos.
- Las claves viven en variables de entorno; `.env.local` no se sube al repositorio.
