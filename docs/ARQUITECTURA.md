# Arquitectura de Bóveda

> **Estado: vigente desde el 05/11/2026.** Por decisión del usuario, la app funciona **sin servidor**: sin Supabase ni Vercel. Se publica gratis en GitHub Pages desde este repositorio público. La versión anterior (Next.js + Supabase + Vercel) quedó en el historial de Git.

## 1. En una frase

Una app web instalable que guarda todo en tu dispositivo (IndexedDB), protegida con un PIN, publicada como archivos estáticos en GitHub Pages. GitHub Actions revisa cada cambio, lo publica y, en fases siguientes, hará las tareas programadas que no usan tus datos (precios, noticias, avisos de mercado).

## 2. Cómo se conectan las piezas

```
   Tu celular o computadora
   ┌────────────────────────────────────┐
   │  Bóveda (app instalada)            │
   │  · pantallas y cálculos            │
   │  · tus datos en IndexedDB          │  ← nunca salen del dispositivo
   │  · PIN para abrirla                │
   │  · service worker: abre sin red    │
   └───────────────▲────────────────────┘
                   │ HTTPS, solo archivos públicos (app y, más adelante, precios)
   ┌───────────────┴────────────────────┐
   │  GitHub Pages                      │
   │  https://4mpj88dbtn-hash.github.io/Boveda-/
   └───────────────▲────────────────────┘
                   │ publica (rama gh-pages)
   ┌───────────────┴────────────────────┐        ┌───────────────────────┐
   │  GitHub Actions                    │ claves │  APIs de mercado,     │
   │  · revisa y prueba cada cambio     │ ──────►│  noticias, Telegram   │
   │  · publica la app                  │ (Fases │  (sin datos tuyos)    │
   │  · tareas programadas (Fases 2–3)  │  2–3)  └───────────────────────┘
   └────────────────────────────────────┘
```

## 3. Piezas y por qué

| Pieza | Herramienta | Por qué |
|---|---|---|
| App | Next.js 16 con `output: "export"` + React 19 + TypeScript + Tailwind 4 | Se compila a archivos estáticos que GitHub Pages sirve gratis |
| Datos | IndexedDB con Dexie | Base de datos del navegador; funciona sin internet |
| Protección | PIN de 6 dígitos (PBKDF2-SHA256, 600,000 vueltas, sal aleatoria) | Sin servidor no hay login; el PIN impide que alguien abra la app en tu dispositivo |
| Sin conexión | Service worker propio | Guarda todas las pantallas al instalarse; la app abre sin red |
| Publicación | GitHub Pages desde la rama `gh-pages` | Gratis con repositorio público; HTTPS incluido |
| Revisión | GitHub Actions | Estilo, tipos, pruebas unitarias, compilación y flujo completo antes de publicar |
| Tareas programadas (Fases 2–3) | GitHub Actions con `schedule` | Bajan precios y noticias con claves guardadas en los secretos del repositorio y los publican como archivos JSON |

## 4. Tus datos

- Viven solo en el navegador del dispositivo donde usas la app. No hay copia en ningún servidor.
- Tablas (`src/lib/db.ts`): `settings` (versión 1), y desde la versión 2 `accounts`, `categories` y `transactions`. Al pasar de la versión 1 a la 2 se conservan los ajustes y se agregan las categorías y la cuenta Efectivo de inicio (prueba en `src/lib/db.test.ts`).
- Montos en centavos enteros con su moneda; cada movimiento en dólares guarda su tipo de cambio, su fuente y su fecha. El saldo de una cuenta se calcula: saldo inicial más sus movimientos.
- **Respaldos:** Ajustes → Descargar respaldo crea un archivo `.json` con todo (menos el PIN). Formato versión 2 desde la Fase 1; los respaldos de la Fase 0 se siguen leyendo. Antes de restaurar se revisa que cada movimiento apunte a cuentas y categorías que existan; la restauración es todo o nada. En el celular abre el menú de compartir para guardarlo en Archivos, iCloud o Drive. Restaurar reemplaza los datos actuales por los del archivo.
- **Riesgo de pérdida:** si pierdes el dispositivo o se borran los datos del navegador, solo los recuperas con un respaldo. En iPhone, Safari borra los datos de sitios que no abres en 7 días; las apps agregadas a la pantalla de inicio llevan su propia cuenta de días, pero hay reportes de borrados. Por eso: instalar la app y respaldar cada semana.
- La app pide al navegador que marque los datos como permanentes (`navigator.storage.persist()`) y muestra en Ajustes si lo concedió.
- **Sincronización:** no hay. Cada dispositivo tiene sus propios datos; para pasar datos de uno a otro se usa un respaldo.

## 5. PIN y bloqueo

- La primera vez la app pide un nombre (opcional) y un PIN de 6 dígitos. Rechaza PIN obvios (111111, 123456, 123123…).
- Nunca se guarda el PIN: solo su huella PBKDF2. La prueba unitaria compara la huella contra un valor calculado aparte con Python.
- Se pide el PIN cada vez que abres la app (o, si lo eliges, solo si pasaron más de 5 minutos) y al volver de otra app tras 1 o 5 minutos.
- Tras 5 errores hay que esperar 30 s, luego el doble cada vez, hasta 15 minutos.
- Si olvidas el PIN no se puede recuperar: la opción es borrar todo y restaurar un respaldo.
- Mientras la app está bloqueada no se dibuja ningún dato.

## 6. Sin conexión y actualizaciones

- Al compilar, `scripts/precache.mjs` escribe en `out/sw.js` la lista de todos los archivos y una versión nueva. El celular detecta el cambio y baja la versión nueva en segundo plano.
- Con internet, cada pantalla se pide fresca (máximo 3 segundos); sin internet se usa la guardada. Los archivos de `/_next/static` nunca cambian de contenido y se sirven desde lo guardado.
- Se conserva la versión anterior una vuelta más, por si una pantalla abierta todavía la necesita.

## 7. Publicación y flujo de trabajo

1. Cada fase se trabaja en su rama (`fase-0`, `fase-1`, …).
2. Cada push corre la revisión en GitHub Actions. Si todo pasa, se publica en la rama `gh-pages` y GitHub Pages lo sirve: la dirección siempre muestra el último avance.
3. Cuando apruebas una fase, su rama se fusiona a `main`.

La ruta base es `/Boveda-` (el nombre del repositorio). Los enlaces de Next la agregan solos; lo demás usa `withBasePath()` de `src/lib/base-path.ts`.

## 8. Qué cambia en las fases siguientes

| Función del SPEC | Cómo queda sin servidor |
|---|---|
| Registro, cuentas, presupuestos, historial (Fase 1) | Igual, todo en el dispositivo y sin conexión |
| Resúmenes semanal y mensual (Fase 1) | Se calculan en la app y aparecen desde la hora indicada (domingo 20:00, día 1 a las 9:00). No llegan solos por Telegram |
| Precios y gráficas (Fase 2) | Una tarea programada de GitHub Actions baja los precios y los publica como JSON; tendrán algunos minutos de retraso, siempre indicado. Cripto puede ir en vivo con un WebSocket público sin clave |
| Noticias y calendario (Fase 3) | Igual que los precios: los arma GitHub Actions |
| Avisos por Telegram (Fase 3) | Los de mercado (pre-apertura, cierre, movimientos fuertes) sí, desde GitHub Actions. Los que usan tus datos (presupuestos, pagos, resúmenes) se ven al abrir la app; se puede enviar a Telegram desde la app a mano |
| Notificaciones push | Solo las de mercado, y requieren un servicio de envío; se evaluará en la Fase 3 |
| Portafolio, calculadoras, guía (Fase 4) | Igual, en el dispositivo. Los datos históricos vienen de los JSON de GitHub Actions |
| Trading simulado (Fase 5) | Igual, con precios con retraso |
| Observaciones con IA (Fase 6) | Requieren una clave de API. Sin servidor, la opción sería que escribas tu propia clave en la app (vive solo en tu dispositivo). Se decide en la Fase 6 |
| Respaldo automático (Fase 6) | Recordatorio semanal para descargar el respaldo; no hay copia automática en la nube |

## 9. Seguridad

- HTTPS lo da GitHub Pages.
- Política de seguridad de contenido en cada página: la app solo carga y se conecta a sus propios archivos (`src/app/layout.tsx`).
- El repositorio es público: nunca se suben claves ni datos. Las claves de las Fases 2–3 vivirán en los secretos de GitHub Actions.
- Las APIs de mercado nunca reciben datos tuyos: las consulta GitHub Actions, no tu dispositivo.
- Los datos en IndexedDB no están cifrados. **Evaluación del 08/11/2026: no se cifran por ahora.** Razones: (1) solo protegería contra alguien que ya tiene tu celular desbloqueado y sabe abrir las herramientas del navegador; (2) si olvidas el PIN perderías también tus respaldos cifrados, y hoy la salida es borrar todo y restaurar; (3) cambiar el PIN obligaría a recifrar todo, con riesgo de perder datos a medio camino. Lo que sí protege: el PIN para abrir la app, que no se dibuje nada mientras está bloqueada y el bloqueo de pantalla de tu celular. Se puede revisar en la Fase 6 junto con el desbloqueo con Face ID.

## 10. Fuentes consultadas (05/11/2026)

- GitHub Pages en repositorios públicos con el plan gratuito: <https://help.github.com/articles/what-is-github-pages>
- Borrado de datos en Safari a los 7 días y excepción de las apps en la pantalla de inicio: <https://searchengineland.com/what-safaris-7-day-cap-on-script-writeable-storage-means-for-pwa-developers-332519> · reporte de borrados: <https://bugs.webkit.org/show_bug.cgi?id=237350>
- Exportación estática de Next.js 16.4: `node_modules/next/dist/docs/01-app/02-guides/static-exports.md`
