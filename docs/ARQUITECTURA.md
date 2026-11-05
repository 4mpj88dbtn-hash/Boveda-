# Arquitectura de Bóveda

> **Estado: aprobada** el 05/11/2026 ("haz la app") con las recomendaciones por defecto: login con contraseña y 2FA, nombre "Bóveda", soporte para iPhone y Android. Es la referencia del proyecto.
>
> **Ajustes al construir la Fase 0:**
> - Service worker propio (`public/sw.js`) en lugar de Serwist: para instalar la app y mostrar la pantalla sin conexión basta con un archivo pequeño que controlamos por completo. Se reevalúa en la Fase 1, cuando llegue el registro sin conexión.
> - Next.js 16.4 trae Cache Components activo: el marco de la app carga al instante y lo que depende de tu sesión llega después, dentro de `<Suspense>`.
> - Todo el inicio de sesión ocurre en el servidor (Server Actions); el navegador nunca habla directo con Supabase.

## 1. En una frase

Una sola app web (Next.js) que vive en Vercel y guarda tus datos en Supabase. Supabase hace de "reloj" para las tareas programadas, y el servidor de la app es el único que habla con las APIs de mercado y con Telegram.

## 2. Cómo se conectan las piezas

```
   Tu celular o computadora
   ┌──────────────────────────────┐
   │  Bóveda (PWA instalada)      │
   │  · pantallas                 │
   │  · cola sin conexión         │
   └──────────────┬───────────────┘
                  │ HTTPS, sesión con 2FA
   ┌──────────────▼───────────────┐   claves    ┌──────────────────────────┐
   │  Servidor de la app (Vercel) │ ──────────► │  APIs de mercado         │
   │  · lee y guarda tus datos    │  solo aquí  │  acciones, cripto, tipo  │
   │  · caché de mercados         │             │  de cambio, macro, RSS   │
   │  · resúmenes y alertas       │             └──────────────────────────┘
   │  · bot de Telegram           │ ──────────► ┌──────────────────────────┐
   └──────┬────────────────▲──────┘             │  Telegram (avisos)       │
          │ datos con RLS  │ "es hora de…"      └──────────────────────────┘
   ┌──────▼────────────────┴──────┐
   │  Supabase                    │
   │  · Postgres (tus datos)      │
   │  · Auth con 2FA              │
   │  · Storage (fotos de ticket) │
   │  · Cron (reloj de tareas)    │
   └──────────────────────────────┘
```

## 3. Lo que se mantiene del stack sugerido

Next.js (App Router) + TypeScript + Tailwind + shadcn/ui como PWA; Supabase (Postgres, Auth, RLS, tareas programadas); Lightweight Charts para mercados y Recharts para finanzas; Telegram + Web Push; Vercel + Supabase en planes gratuitos; Zod; dinero en centavos. Versiones vigentes en `CLAUDE.md`.

## 4. Ajustes que propongo y por qué

1. **El reloj de tareas es Supabase Cron, no Vercel Cron.** En el plan gratuito de Vercel, cada tarea programada corre máximo una vez al día y puede dispararse en cualquier momento dentro de la hora indicada. Los resúmenes (domingo 20:00), la pre-apertura y las alertas necesitan puntualidad. Supabase Cron corre al minuto exacto.
2. **La lógica del servidor vive en Next.js, no en Edge Functions separadas.** Supabase Cron llama a rutas protegidas de la app en Vercel. Así todo está en un solo lenguaje, las fórmulas probadas se usan igual en pantalla y en los resúmenes, y cada cambio se publica solo al hacer push. Si algún día Vercel se queda corto, esas tareas se pueden mover a Edge Functions.
3. **Login: correo + contraseña + código 2FA obligatorio.** Las passkeys (Face ID o huella) en Supabase están en beta desde mayo de 2026 y su API todavía puede cambiar. Propongo 2FA con app autenticadora ahora y agregar passkey cuando sea estable. Además, las reglas de la base de datos exigen sesión con 2FA: sin el código, no se ve ningún dato, aunque alguien tenga tu contraseña.
4. **Fuentes tipográficas auto-alojadas** (paquetes de Fontsource) en lugar de cargarlas de Google Fonts al abrir la app: carga más rápida, más privada y funcionan sin conexión.
5. **Tipo de movimiento "transferencia".** Pagar la tarjeta desde el banco o pasar dinero a tu cuenta de inversión no es un gasto. Sin este tipo, los resúmenes contarían doble.
6. **Migraciones automáticas.** Los cambios a la base de datos se guardan como archivos en el repositorio y GitHub Actions los aplica al pasar a `main`. Tú no tienes que copiar ni pegar SQL.
7. **Movimientos sin conexión con identificador propio.** Cada movimiento nace en tu celular con un identificador único; si se sincroniza dos veces, no se duplica.

## 5. Estructura de carpetas

```
src/
  proxy.ts                   renueva la sesión y manda a cada quien a su paso (entrar, 2FA, app)
  app/                       rutas (las URLs van en español)
    entrar/                  contraseña, activar 2FA y verificar código
    (app)/                   todo lo que requiere sesión con 2FA
      page.tsx               Centro de mando
      finanzas/ mercados/ inversion/ trading/ senales/ boveda/ ajustes/
    sin-conexion/            pantalla que muestra el service worker sin internet
    api/                     (Fase 3) cron/[tarea] para Supabase Cron y telegram/ para el bot
  modules/                   un módulo por área
    profile/                 perfil y saludo
    command-center/          encabezado del patrimonio y saludo
    finance/ markets/ news/ investing/ trading/   (fases siguientes)
      lib/                   cálculos puros + sus pruebas (*.test.ts)
  components/
    ui/                      componentes base (botón, campo, panel, monto, avisos)
    layout/                  barra inferior, barra lateral, hoja de registro rápido
  lib/                       compartido: money.ts, dates.ts, env.ts, utils.ts, auth/, supabase/
public/sw.js                 service worker propio
supabase/
  migrations/                SQL versionado: tablas, RLS, tareas programadas
  tests/database/            pruebas pgTAP de las reglas de acceso
tests/e2e/                   pruebas de flujo completo (Playwright)
.github/workflows/           revisión automática y migraciones
docs/                        SPEC, arquitectura y diseño
```

## 6. Modelo de datos (Fases 0 y 1)

Todas las tablas llevan `user_id` y Row Level Security.

| Tabla | Para qué | Campos principales |
|---|---|---|
| `profiles` | Tus ajustes | nombre para el saludo, zona horaria, moneda principal, preferencias |
| `accounts` | Cuentas y patrimonio | nombre, tipo (efectivo, banco, tarjeta, inversión, cripto, bien, deuda), moneda, saldo inicial, activo o pasivo |
| `categories` | Categorías y subcategorías | tipo (ingreso o gasto), categoría padre, ícono, grupo 50/30/20, orden, archivada |
| `transactions` | Cada movimiento | identificador creado en el dispositivo, tipo (ingreso, gasto, transferencia), monto en centavos, moneda, tipo de cambio con fuente y fecha, monto en MXN, categoría, cuenta (y cuenta destino), método de pago, fecha, nota, foto, etiquetas |
| `recurring_rules` | Movimientos recurrentes | frecuencia, próximo cobro, registrar solo o pedir confirmación |
| `templates` | Plantillas de gastos frecuentes | movimiento predefinido |
| `budgets` | Presupuestos | categoría, mes, monto |
| `fx_rates` | Tipos de cambio usados | fecha, fuente (p. ej. FIX de Banxico), valor |
| `summaries` | Resúmenes generados | periodo, cifras calculadas, fecha de generación |

Patrimonio neto = activos − pasivos, con saldos calculados desde el saldo inicial y los movimientos de cada cuenta.

## 7. Dinero, monedas y fechas

- Montos en **centavos enteros** junto con su moneda. Nunca decimales de punto flotante.
- Un gasto en USD guarda: monto en centavos de dólar, tipo de cambio usado, su fuente y su fecha, y el monto convertido a MXN (redondeado al centavo, mitades hacia arriba). Los resúmenes suman en MXN.
- Tipo de cambio por defecto: el FIX de Banxico del día; si todavía no se publica, el último disponible, indicando su fecha. Puedes cambiarlo a mano por el que te cobró tu banco.
- Las fechas de los movimientos son días de Cancún. Las semanas van de lunes a domingo.
- Horarios de mercado: se convierten de `America/New_York` a `America/Cancun` con la base de datos de zonas horarias, nunca con desfases fijos. Verificado: la apertura de NYSE (9:30 en Nueva York) cae a las 8:30 en Cancún en julio y a las 9:30 en diciembre.

## 8. Tareas programadas

Supabase Cron usa hora UTC. Como Cancún es UTC−5 todo el año, los horarios fijos se convierten una sola vez:

| Tarea | Hora de Cancún | Programación (UTC) |
|---|---|---|
| Resumen semanal | domingo 20:00 | lunes 01:00 → `0 1 * * 1` |
| Resumen mensual | día 1, 9:00 | día 1, 14:00 → `0 14 1 * *` |
| Pre-apertura (Fase 3) | ~1 h antes de NYSE | corre a las dos horas posibles (`30 12,13 * * 1-5`) y el servidor decide cuál toca según el horario de verano de EE. UU. y los festivos |
| Cierre (Fase 3) | después del cierre de NYSE | igual que la pre-apertura |
| Alertas (Fase 3) | cada pocos minutos | la frecuencia se define según los límites de las APIs |

## 9. Modo sin conexión

- El service worker guarda la app para que abra sin internet.
- El botón "+" funciona sin conexión: el movimiento se guarda en el celular (IndexedDB) y se sube al recuperar conexión con la app abierta.
- Los datos de mercado sin conexión muestran el último valor guardado con su antigüedad.

## 10. Datos de mercado

**Arquitectura:** cada proveedor tiene un "adaptador" con la misma forma. El servidor consulta, guarda en caché en la base de datos y la app lee solo de ahí. Cada dato guarda fuente, hora y retraso. Cambiar de proveedor no toca las pantallas.

**Propuesta preliminar de fuentes** (la combinación final se confirma al empezar la Fase 2, con los límites vigentes en ese momento):

| Necesidad | Propuesta | Verificado el 05/11/2026 | Pendiente de verificar |
|---|---|---|---|
| ETFs y acciones de EE. UU. (VOO, IVV, SPY, QQQ, empresas) | Finnhub | Plan gratis: 60 llamadas/min, solo uso personal, cobertura EE. UU. | Retraso de las cotizaciones |
| Índices y velas históricas | Twelve Data | Plan gratis: 8 créditos/min y 800/día | Si el plan gratis incluye índices (S&P 500, Nasdaq, Dow, IPC). Si no, se muestran ETFs de referencia (SPY, QQQ, DIA) marcados como tales |
| Cripto (BTC, ETH) | CoinGecko (Demo) + WebSocket público de un exchange para tiempo real | 10,000 llamadas/mes; su página de precios dice 30/min y su documentación 100/min; pide atribución | Qué exchange funciona desde el navegador en México y desde servidores en EE. UU. |
| USD/MXN | FIX oficial: API SIE de Banxico (serie SF43718) + una fuente spot | La API pide un token gratuito | Límites exactos de consultas |
| Índice dólar (DXY) | Sin fuente gratuita confirmada. Opciones: calcularlo con su fórmula pública a partir de 6 tipos de cambio (marcado "aproximado") o usar un ETF de referencia | — | Fase 2 |
| Oro y petróleo WTI | Twelve Data o FRED | — | Fase 2 |
| VIX, bono a 10 años, tasa de la Fed | FRED (datos diarios) | — | Retraso de cada serie |
| Tasa objetivo de Banxico, INPC | Banxico SIE e INEGI | — | Fases 2 y 3 |
| Noticias | Finnhub + RSS de medios financieros | — | Fase 3 |
| Calendario económico | Calendarios oficiales (Fed, Banxico, INEGI) + fechas de publicación de FRED | — | Fase 3 |
| Atajo para gráficas | Widgets embebibles de TradingView | — | Fase 2 |

**Claves que necesitarás (Fases 2 y 3, todas gratuitas con registro):** Finnhub, Twelve Data, CoinGecko, token SIE de Banxico, FRED e INEGI, más el token de tu bot de Telegram. Te guiaré para sacar cada una cuando lleguemos; no necesitas ninguna para la Fase 0.

## 11. Notificaciones

- **Telegram (canal principal):** bot personal que solo responde a tu chat. Cada mensaje que Telegram envía a la app trae un secreto acordado al configurar el bot; los que no lo traen se rechazan.
- **Web Push:** desde la PWA instalada. En iPhone, las notificaciones web solo funcionan si la app está agregada a la pantalla de inicio (iOS 16.4 o posterior).

## 12. Seguridad

- 2FA obligatorio y registro público desactivado: solo existe tu cuenta.
- Row Level Security en todas las tablas, exigiendo sesión verificada con 2FA (`aal2`).
- Las tareas programadas llaman a la app con un secreto; sin él, las rutas no responden.
- Claves solo en variables de entorno del servidor (Vercel y Supabase). `.env.example` documenta cuáles existen, sin valores.
- Las APIs de mercado nunca reciben datos tuyos. Los registros de errores no guardan montos, notas ni datos personales.
- Respaldos: según fuentes externas, el plan gratuito de Supabase no incluye respaldos automáticos. En la Fase 6 propondré un respaldo automático cifrado; mientras tanto, la exportación completa estará disponible.

## 13. Pruebas y calidad

- **Vitest** para cada fórmula, resumen y conversión, con casos calculados a mano.
- **Playwright** para flujos clave: registrar un gasto en 3 toques, iniciar sesión con 2FA.
- **GitHub Actions** revisa tipos, estilo y pruebas en cada push; si algo falla, no se fusiona.

## 14. Flujo de trabajo

1. Cada fase se trabaja en su rama (`fase-0`, `fase-1`, …).
2. Cada push genera un enlace de vista previa en Vercel para que pruebes en tu celular.
3. Cuando apruebas, la fase pasa a `main` y se publica en tu dirección principal.

## 15. Costos

Con los planes gratuitos el costo estimado es **$0 al mes**. Límites a considerar:

- **Vercel Hobby:** para proyectos personales, no comerciales (este lo es).
- **Supabase Free:** se pausa tras 7 días con poca actividad. Tu uso diario y las tareas programadas lo mantienen activo; si se pausa, se reactiva desde el panel.
- **APIs de mercado:** los planes gratuitos tienen límites por minuto y por día y, en algunos casos, datos con retraso. La app lo muestra siempre.
- **Opcional:** un dominio propio tiene costo anual; no es necesario.

## 16. Lo que necesitaré de ti en la Fase 0

1. **Supabase:** crear una cuenta (puede ser con tu GitHub) y un proyecto llamado `boveda` en la región East US (North Virginia), cerca de donde corre Vercel. Guarda la contraseña de la base de datos en un lugar seguro.
2. **Vercel:** crear una cuenta con tu GitHub e importar el repositorio `Boveda-`.
3. **App autenticadora** en tu celular (Google Authenticator, Microsoft Authenticator, 1Password u otra).
4. **Variables secretas:** te diré exactamente cuáles copiar y dónde pegarlas (Vercel y GitHub). Nunca pegues claves secretas en el chat.

## 17. Fuentes consultadas (05/11/2026)

Este entorno de desarrollo no pudo abrir directamente supabase.com, vercel.com ni banxico.org.mx; los datos se verificaron por búsqueda web y se volverán a revisar al usarse.

- Supabase — passkeys (experimental, beta desde el 28/05/2026): <https://supabase.com/docs/guides/auth/passkeys> · <https://supabase.com/changelog/46458-passkeys-for-supabase-auth-beta>
- Supabase — pausa de proyectos gratuitos: <https://supabase.com/docs/guides/platform/free-project-pausing>
- Supabase — límites del plan gratuito (fuente externa): <https://www.jetadmin.io/blog/supabase-pricing-2026-guide-to-plans-limits-and-real-world-costs/>
- Vercel — límites de Cron en plan Hobby: <https://vercel.com/docs/cron-jobs/usage-and-pricing>
- Twelve Data — límites del plan Basic: <https://support.twelvedata.com/en/articles/5194820-api-credits-limits> · <https://twelvedata.com/pricing>
- Finnhub — precios y límites: <https://finnhub.io/pricing>
- CoinGecko — plan Demo: <https://www.coingecko.com/en/api/pricing> · <https://docs.coingecko.com/docs/errors-and-rate-limits>
- Banxico — API SIE y serie FIX: <https://www.banxico.org.mx/SieAPIRest/service/v1/> · <https://rdrr.io/cran/siebanxicor/f/README.md>
- Versiones de paquetes: registro de npm (`npm view`), 05/11/2026.
