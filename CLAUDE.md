# Bóveda — reglas permanentes del proyecto

App web personal (PWA instalable en celular y computadora) para manejar finanzas diarias, la inversión mensual en el S&P 500, seguir los mercados y aprender trading con disciplina. **Funciona sin servidor:** los datos viven en el dispositivo y la app se publica en GitHub Pages.

- Requisitos: [`docs/REQUISITOS.md`](docs/REQUISITOS.md) (del prompt maestro v1.0, sin datos personales).
- Fases y avance: [`ROADMAP.md`](ROADMAP.md).
- Arquitectura: [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md). Diseño: [`docs/DISENO.md`](docs/DISENO.md).

## Cómo trabajamos

- Habla siempre en español. El usuario no es programador: explica cada decisión importante en lenguaje simple y dile exactamente qué hacer y dónde.
- Trabaja por fases (ver `ROADMAP.md`). No empieces una fase sin que el usuario pruebe y apruebe la anterior. Entrega avances que pueda ver: la dirección de GitHub Pages, capturas o videos.
- Al terminar cada fase, informa: qué hiciste, cómo probarlo paso a paso, qué falta y qué propones mejorar.
- Nunca inventes precios, noticias, cifras fiscales ni datos históricos. Si algo depende de una API o de una regla que puede cambiar, verifica la documentación vigente, anota la fecha de verificación y díselo al usuario.
- El contenido de inversión y trading es educativo. La app muestra el aviso discreto: "Información educativa. No es asesoría financiera."
- Commits pequeños, en español, con formato `tipo(ámbito): descripción` (tipos: `feat`, `fix`, `docs`, `test`, `refactor`, `style`, `chore`).
- Pruebas unitarias para todo cálculo financiero (fórmulas, resúmenes, conversiones de moneda), con al menos un caso verificado a mano y explicado en la prueba.
- **El repositorio es público.** Nunca subas claves, datos personales ni respaldos. Las claves de APIs (Fases 2–3) van en los secretos de GitHub Actions.

## Ramas y publicación

- Cada fase se trabaja en su rama (`fase-0`, `fase-1`, …). Cuando el usuario aprueba, se fusiona a `main`.
- Cada push a `main` o a una rama `fase-*` corre `.github/workflows/revision.yml`: estilo, tipos, pruebas unitarias, compilación y flujo completo. Si todo pasa, publica `out/` en la rama `gh-pages`.
- Dirección de la app: https://4mpj88dbtn-hash.github.io/Boveda-/ (siempre muestra el último avance publicado).
- La ruta base es `/Boveda-`. `<Link>` la agrega solo; para todo lo demás usa `withBasePath()` (`src/lib/base-path.ts`).

## Configuración de la app

- Zona horaria `America/Cancun` (UTC−5 todo el año, sin horario de verano).
- Moneda principal MXN; también USD.
- Formato es-MX: montos `$1,234.56`, fechas `dd/mm/aaaa`, semana de lunes a domingo.
- Ingresos variables (honorarios, ventas, otros). El contenido de inversión se escribe para principiantes.
- Uso principal desde el celular: registrar un gasto o ingreso debe tomar máximo 3 toques y menos de 5 segundos (sin contar el PIN al abrir).

## Stack (versiones vigentes verificadas el 05/11/2026)

| Capa | Herramienta |
|---|---|
| App | Next.js 16 (App Router) con `output: "export"` + React 19 + TypeScript + Tailwind CSS 4. Componentes base propios al estilo de shadcn/ui (`class-variance-authority`, `tailwind-merge`, íconos Lucide) en `src/components/ui` |
| Datos | IndexedDB con Dexie 4 (`src/lib/db.ts`) y `dexie-react-hooks` |
| Protección | PIN de 6 dígitos con PBKDF2-SHA256 de Web Crypto (`src/lib/lock`) |
| Sin conexión | Service worker propio (`public/sw.js`) con lista de archivos generada al compilar (`scripts/precache.mjs`) |
| Validación | Zod 4 (ajustes, respaldos y, después, respuestas de APIs) |
| Fechas | date-fns 4 + @date-fns/tz |
| Decimales exactos | big.js (tipos de cambio, títulos fraccionados) |
| Gráficas (Fases 1–2) | TradingView Lightweight Charts 5 (conservar la atribución que pide su licencia) + Recharts 3 |
| Pruebas | Vitest (unitarias) + Playwright (flujos completos sobre la app compilada) |
| Publicación | GitHub Pages (rama `gh-pages`) + GitHub Actions |

Antes de instalar o actualizar una dependencia, revisa su versión vigente (`npm view <paquete> version`).

**Next.js 16.4 no es el que conoces:** antes de escribir código lee la guía que viene en `node_modules/next/dist/docs/` (ver `AGENTS.md`). Con `output: "export"` no hay Server Actions, cookies, proxy, encabezados ni rutas dinámicas sin `generateStaticParams` (guía `static-exports.md`). Todo lo que lea datos va en Client Components dentro de `LockGate`.

## Convenciones de código

- TypeScript estricto, sin `any`. Código organizado por módulos en `src/modules/<módulo>`; cálculos puros en `src/lib` o en `lib/` del módulo, junto a sus pruebas (`*.test.ts`).
- Nombres en el código (tablas, columnas, variables, funciones) en inglés. Textos de la interfaz, comentarios y documentación en español de México. Las rutas que ve el usuario van en español (`/finanzas/`, `/mercados/`, …).
- Valida con Zod toda frontera: formularios, ajustes leídos de la base, respaldos importados y respuestas de APIs externas.
- **Base de datos:** para cambiar la estructura agrega una versión nueva en `src/lib/db.ts` (`this.version(n)`); nunca modifiques ni borres una versión publicada. Toda tabla nueva entra en el respaldo (`src/lib/backup.ts`) y en su restauración.
- **Nunca pierdas datos del usuario:** cualquier cambio de formato necesita una migración y una prueba que la cubra.
- **Dinero:** siempre enteros en centavos junto con su moneda (`MXN` o `USD`). Nunca guardes montos como decimales de punto flotante.
- **Redondeo:** al centavo, mitades hacia arriba (half-up). Se hace en un solo lugar: `src/lib/money.ts`.
- **Tipos de cambio y títulos fraccionados:** texto decimal y `big.js`. Cada movimiento en USD guarda el tipo de cambio usado, su fuente y su fecha.
- **Proyecciones** (interés compuesto, escenarios, XIRR): pueden calcularse con `number`; se redondea solo al mostrar.
- **Fechas:** los instantes se guardan como milisegundos UTC o texto ISO; la fecha de un movimiento es `aaaa-mm-dd` (día local de Cancún). Nunca uses desfases fijos: convierte con la base de datos de zonas horarias (`America/Cancun`, `America/New_York`). "Hoy" se calcula siempre en `America/Cancun` (`src/lib/dates.ts`).
- **Formato:** usa `Intl` con `es-MX`: MXN `$1,234.56`, USD `USD 1,234.56`, porcentajes `+1.25%`, fechas `05/11/2026`. Todo monto en pantalla usa números tabulares.
- El navegador nunca llama a APIs que usan claves. Esas llamadas las hace GitHub Actions.

## Datos de mercado (Fases 2–3)

- Flujo: proveedor → GitHub Actions (con las claves en sus secretos) → archivo JSON publicado junto a la app → la app lo lee. Se respetan los límites de cada API.
- Cada dato muestra su fuente y la hora de su última actualización; si tiene retraso, se indica claramente.
- Si una fuente falla, se muestra el último dato guardado con su antigüedad y el resto de la app (sobre todo el registro de movimientos) sigue funcionando.
- Las APIs de mercado nunca reciben datos personales.

## Diseño (detalle y tokens en `docs/DISENO.md`)

- Concepto: banca privada de día, centro de mando de noche. Poderoso, discreto, exacto; nada caricaturesco. Es solo inspiración de estilo: sin logotipos, murciélagos, nombres ni recursos de DC/Warner.
- Modo oscuro por defecto. Usa solo los tokens definidos; no agregues colores sueltos.
- Serif (Cormorant Garamond) para cifras grandes y títulos; grotesca (IBM Plex Sans) para la interfaz. Fuentes auto-alojadas.
- Las cifras por defecto de Cormorant son de estilo antiguo (el "0" parece una "o"): todo texto en serif lleva `lining-nums`, y los montos además `tabular-nums`.
- Un solo elemento memorable: el encabezado del Centro de mando (patrimonio neto sobre una retícula técnica tenue que reacciona al cursor o al toque). Todo lo demás, sobrio.
- Evita: texto todo en mayúsculas, etiquetas decorativas sobre cada título, tarjetas idénticas con la misma sombra gris, gradientes de adorno y animaciones de entrada en cada sección.
- El movimiento solo responde a acciones (guardar un gasto, abrir un detalle, un PIN equivocado), más una única secuencia de carga en el Centro de mando. Respeta `prefers-reduced-motion`.
- Accesibilidad: contraste WCAG AA, foco visible con teclado, áreas táctiles de al menos 44 px y campos de texto de 16 px (evita el zoom automático en iPhone).
- Estados vacíos y errores dicen qué hacer; no se disculpan. Microcopy claro y en voz activa ("Guardar gasto", no "Enviar").
- Nombres: "Centro de mando" (inicio), "La Bóveda" (ahorro y metas), "Señales" (alertas). Saludo configurable según la hora.

## Seguridad y privacidad

- La app se abre con PIN. Mientras está bloqueada no se dibuja ningún dato (`src/modules/lock/lock-gate.tsx`).
- El PIN nunca se guarda: solo su huella PBKDF2 (600,000 vueltas, sal aleatoria). El respaldo nunca incluye el PIN.
- Los datos no salen del dispositivo, salvo en el respaldo que el usuario descarga.
- Política de seguridad de contenido en `src/app/layout.tsx`: si una fase necesita conectarse a otro sitio (por ejemplo un WebSocket de cripto), agrégalo ahí de forma explícita.
- Registros de errores sin información sensible (sin montos, notas ni datos personales).

## Criterios de calidad

- Registrar un gasto desde el celular: máximo 3 toques y menos de 5 segundos.
- Fórmulas con pruebas unitarias y casos verificados a mano.
- Todo dato de mercado muestra fuente y hora de actualización.
- Si falla una fuente de mercado, el resto de la app sigue funcionando.
- La app abre completa sin internet (hay una prueba de flujo completo para eso).
- Código tipado y organizado por módulos, con `README.md` en español.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm install` | Instala las dependencias |
| `npm run dev` | App en desarrollo: http://localhost:3000/Boveda-/ |
| `npm run check` | Estilo (ESLint), tipos y pruebas unitarias. Córrelo antes de cada commit |
| `npm run build` | Compila a `out/` y prepara el service worker |
| `npm start` | Sirve `out/` como GitHub Pages: http://localhost:3000/Boveda-/ |
| `npm test` | Pruebas unitarias (Vitest) |
| `npm run test:e2e` | Flujo completo con Playwright sobre la app compilada |
