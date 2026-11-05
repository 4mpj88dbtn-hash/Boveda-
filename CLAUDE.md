# Bóveda — reglas permanentes del proyecto

App web personal (PWA instalable en celular y computadora) para manejar finanzas diarias, la inversión mensual en el S&P 500, seguir los mercados y aprender trading con disciplina.

- Fuente de verdad: [`docs/SPEC.pdf`](docs/SPEC.pdf) (prompt maestro v1.0).
- Fases y avance: [`ROADMAP.md`](ROADMAP.md).
- Arquitectura: [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md). Diseño: [`docs/DISENO.md`](docs/DISENO.md).

## Cómo trabajamos

- Habla siempre en español. El usuario no es programador: explica cada decisión importante en lenguaje simple y dile exactamente qué comandos correr y dónde.
- Trabaja por fases (ver `ROADMAP.md`). No empieces una fase sin que el usuario pruebe y apruebe la anterior.
- Al terminar cada fase, informa: qué hiciste, cómo probarlo paso a paso, qué falta y qué propones mejorar.
- Nunca inventes precios, noticias, cifras fiscales ni datos históricos. Si algo depende de una API o de una regla que puede cambiar, verifica la documentación vigente, anota la fecha de verificación y díselo al usuario.
- El contenido de inversión y trading es educativo. La app muestra el aviso discreto: "Información educativa. No es asesoría financiera."
- Commits pequeños, en español, con formato `tipo(ámbito): descripción` (tipos: `feat`, `fix`, `docs`, `test`, `refactor`, `style`, `chore`).
- Pruebas unitarias para todo cálculo financiero (fórmulas, resúmenes, conversiones de moneda), con al menos un caso verificado a mano y explicado en la prueba.

## Ramas y despliegue

- `main` es producción (Vercel). Cada fase se trabaja en su propia rama (`fase-0`, `fase-1`, …).
- Cada push a una rama genera una vista previa en Vercel para probar en el celular. Cuando el usuario aprueba, la rama se fusiona a `main` con un pull request.
- Las migraciones de base de datos viven en `supabase/migrations/` y se aplican con GitHub Actions al fusionar a `main`. Nunca se cambia la base de producción a mano.

## Contexto del usuario

- Vive en Cancún, Quintana Roo. Zona horaria `America/Cancun` (UTC−5 todo el año, sin horario de verano).
- Moneda principal MXN; también maneja USD.
- Formato es-MX: montos `$1,234.56`, fechas `dd/mm/aaaa`, semana de lunes a domingo.
- Ingresos variables (honorarios, ventas, otros). Principiante en inversión.
- Usa la app sobre todo desde el celular: registrar un gasto o ingreso debe tomar máximo 3 toques y menos de 5 segundos.

## Stack (versiones vigentes verificadas el 05/11/2026)

| Capa | Herramienta |
|---|---|
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui |
| PWA y modo sin conexión | Serwist (service worker) + IndexedDB con Dexie (cola de movimientos que se sincroniza después) |
| Datos y autenticación | Supabase: Postgres, Auth con 2FA, Row Level Security, Storage y Cron |
| Lógica de servidor | Route Handlers y Server Actions de Next.js en Vercel; las tareas programadas las dispara Supabase Cron |
| Validación | Zod 4 |
| Fechas | date-fns 4 + @date-fns/tz |
| Decimales exactos | big.js (tipos de cambio, títulos fraccionados) |
| Gráficas | TradingView Lightweight Charts 5 (mercados; conservar la atribución que pide su licencia) + Recharts 3 (finanzas personales) |
| Notificaciones | Bot personal de Telegram (canal principal) + Web Push |
| Pruebas | Vitest (unitarias) + Playwright (flujos completos) |
| Despliegue | Vercel (plan Hobby) + Supabase (plan Free) |

Antes de instalar o actualizar una dependencia, revisa su versión vigente (`npm view <paquete> version`).

## Convenciones de código

- TypeScript estricto, sin `any`. Código organizado por módulos en `src/modules/<módulo>`; cálculos puros en `lib/` de cada módulo, junto a sus pruebas (`*.test.ts`).
- Nombres en el código (tablas, columnas, variables, funciones) en inglés. Textos de la interfaz, comentarios y documentación en español de México. Las rutas que ve el usuario van en español (`/finanzas`, `/mercados`, …).
- Valida con Zod toda frontera: formularios, Server Actions, respuestas de APIs externas y variables de entorno.
- **Dinero:** siempre enteros en centavos (`bigint` en Postgres, entero en TypeScript) junto con su moneda (`MXN` o `USD`). Nunca guardes montos como decimales de punto flotante.
- **Redondeo:** al centavo, mitades hacia arriba (half-up). Se hace en un solo lugar: `src/lib/money.ts`.
- **Tipos de cambio y títulos fraccionados:** `numeric` en Postgres y `big.js` en TypeScript. Cada movimiento en USD guarda el tipo de cambio usado, su fuente y su fecha.
- **Proyecciones** (interés compuesto, escenarios, XIRR): pueden calcularse con `number`; se redondea solo al mostrar.
- **Fechas:** los instantes se guardan como `timestamptz` (UTC); la fecha de un movimiento es `date` (día local de Cancún). Nunca uses desfases fijos: convierte siempre con la base de datos de zonas horarias (`America/Cancun`, `America/New_York`). "Hoy" se calcula siempre en `America/Cancun`.
- **Formato:** usa `Intl` con `es-MX`: MXN `$1,234.56`, USD `USD 1,234.56`, porcentajes `+1.25%`, fechas `05/11/2026`. Todo monto en pantalla usa números tabulares.
- Las claves de API solo existen en el servidor (`import 'server-only'`). El navegador nunca llama a APIs que usan claves.

## Datos de mercado

- Flujo: proveedor → caché en la base de datos → app. Se respetan los límites de cada API.
- Cada dato muestra su fuente y la hora de su última actualización; si tiene retraso (por ejemplo, 15 minutos), se indica claramente.
- Si una API falla, se muestra el último dato guardado con su antigüedad y el resto de la app (sobre todo el registro de movimientos) sigue funcionando.
- Las APIs de mercado nunca reciben datos personales.

## Diseño (detalle y tokens en `docs/DISENO.md`)

- Concepto: banca privada de día, centro de mando de noche. Poderoso, discreto, exacto; nada caricaturesco. Es solo inspiración de estilo: sin logotipos, murciélagos, nombres ni recursos de DC/Warner.
- Modo oscuro por defecto. Usa solo los tokens definidos; no agregues colores sueltos.
- Serif (Cormorant Garamond) para cifras grandes y títulos; grotesca (IBM Plex Sans) para la interfaz. Fuentes auto-alojadas.
- Las cifras por defecto de Cormorant son de estilo antiguo (el "0" parece una "o"): todo texto en serif lleva `lining-nums`, y los montos además `tabular-nums`.
- Un solo elemento memorable: el encabezado del Centro de mando (patrimonio neto sobre una retícula técnica tenue que reacciona al cursor o al toque). Todo lo demás, sobrio.
- Evita: texto todo en mayúsculas, etiquetas decorativas sobre cada título, tarjetas idénticas con la misma sombra gris, gradientes de adorno y animaciones de entrada en cada sección.
- El movimiento solo responde a acciones (guardar un gasto, abrir un detalle), más una única secuencia de carga en el Centro de mando. Respeta `prefers-reduced-motion`.
- Accesibilidad: contraste WCAG AA, foco visible con teclado, áreas táctiles de al menos 44 px y campos de texto de 16 px (evita el zoom automático en iPhone).
- Estados vacíos y errores dicen qué hacer; no se disculpan. Microcopy claro y en voz activa ("Guardar gasto", no "Enviar").
- Nombres: "Centro de mando" (inicio), "La Bóveda" (ahorro y metas), "Señales" (alertas). Saludo configurable según la hora.

## Seguridad y privacidad

- Autenticación obligatoria con 2FA. Registro público desactivado: solo existe la cuenta del usuario.
- Row Level Security en todas las tablas; las políticas exigen una sesión verificada con 2FA (`aal2`).
- Claves solo en variables de entorno del servidor. `.env*` va en `.gitignore`; `.env.example` se mantiene al día.
- Registros de errores sin información sensible (sin montos, notas ni datos personales).
- Respaldos automáticos y exportación completa de los datos.

## Criterios de calidad

- Registrar un gasto desde el celular: máximo 3 toques y menos de 5 segundos.
- Fórmulas con pruebas unitarias y casos verificados a mano.
- Todo dato de mercado muestra fuente y hora de actualización.
- Si falla una API de mercado, el resto de la app sigue funcionando.
- Código tipado y organizado por módulos, con `README.md` en español: cómo correrlo, desplegarlo y qué claves necesita.

## Comandos

Se completan en la Fase 0, al crear el proyecto (instalar, desarrollo, pruebas, revisión de código y compilación).
