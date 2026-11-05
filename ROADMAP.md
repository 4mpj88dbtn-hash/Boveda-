# Hoja de ruta — Bóveda

Regla: no se empieza una fase sin que la anterior esté probada y aprobada por el usuario.
Al cerrar cada fase se informa: qué se hizo, cómo probarlo paso a paso, qué falta y qué se propone mejorar.

Estado: ⬜ pendiente · 🟨 en curso · ✅ aprobada

| Fase | Contenido | Entregable | Estado |
|---|---|---|---|
| 0 — Base | Arquitectura, repo, `CLAUDE.md`, `ROADMAP.md`, tokens de diseño, componentes base, autenticación, PWA | App vacía con el diseño y login funcionando | 🟨 |
| 1 — Finanzas | Registro rápido, categorías, cuentas, historial, resúmenes semanal y mensual, presupuestos | Ya puedo usarla a diario | ⬜ |
| 2 — Mercados | Watchlist, gráficas, comparador base 100, estado del mercado | Veo todos mis activos clave | ⬜ |
| 3 — Noticias y señales | Feed, calendario económico, bot de Telegram, alertas, resúmenes de apertura y cierre | Me llegan avisos al celular | ⬜ |
| 4 — Inversión S&P 500 | Portafolio, calculadoras, guía educativa, fundamentales | Controlo y entiendo mi inversión | ⬜ |
| 5 — Trading | Simulador, diario, estadísticas, calculadoras, guías | Practico con método | ⬜ |
| 6 — Pulido | Metas, deudas, tarjetas, suscripciones, exportación, IA opcional, respaldos, rendimiento | Versión completa | ⬜ |

Las secciones citadas (§) se refieren a [`docs/SPEC.pdf`](docs/SPEC.pdf). Donde el SPEC no dice en qué fase va algo, la asignación es una propuesta y está marcada así: *(propuesta)*.

---

## Fase 0 — Base 🟨

**Entregable:** app vacía con el diseño y login funcionando.

- [x] Leer el SPEC completo; crear `CLAUDE.md` y `ROADMAP.md`
- [x] Proponer arquitectura ([`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md)), tokens de diseño y bocetos del Centro de mando ([`docs/DISENO.md`](docs/DISENO.md))
- [ ] Aprobación del usuario: arquitectura, tokens y bocetos
- [ ] Proyecto Next.js + TypeScript + Tailwind + shadcn/ui, con revisión de código y pruebas (Vitest)
- [ ] Tokens de diseño, tipografías auto-alojadas y modo oscuro
- [ ] Componentes base: botones, campos, tarjetas, montos con números tabulares, aviso educativo, estados vacíos y de error
- [ ] Navegación: barra inferior con "+" central (celular) y barra lateral (escritorio)
- [ ] Centro de mando vacío con el encabezado memorable (retícula técnica) y su única secuencia de carga
- [ ] Supabase: migración inicial (perfil y ajustes) con Row Level Security
- [ ] Inicio de sesión con 2FA obligatorio; registro público desactivado; cerrar sesión
- [ ] PWA: manifiesto, íconos, instalable, pantalla sin conexión
- [ ] GitHub Actions: revisión de tipos, pruebas y migraciones automáticas al fusionar a `main`
- [ ] Despliegue en Vercel, `README.md` en español y `.env.example`

**Cómo se aprueba:** instalas la app en tu celular, entras con tu cuenta y tu código 2FA, y ves el Centro de mando con el diseño.

## Fase 1 — Finanzas ⬜

**Entregable:** ya puedo usarla a diario.

- Registro rápido (§3.1): botón "+" siempre visible; monto → categoría → guardar; fecha de hoy por defecto; máximo 3 toques y menos de 5 segundos
- Campos completos: tipo, monto, moneda (MXN o USD, con conversión al tipo de cambio del día), categoría, subcategoría, método de pago, cuenta, nota, foto del ticket y etiquetas
- Categorías predefinidas y editables (gastos e ingresos de §3.1)
- Cuentas (efectivo, bancos, tarjetas, inversiones, cripto, bienes), patrimonio neto y su gráfica mensual (§3.3)
- Transferencias entre cuentas, que no cuentan como gasto ni ingreso *(propuesta)*
- Movimientos recurrentes, "Repetir último" y plantillas de gastos frecuentes
- Historial con búsqueda, edición, eliminación y filtros por fecha, categoría y cuenta
- Registro sin conexión que se sincroniza después
- Resúmenes automáticos semanal (domingo 20:00) y mensual (día 1, 9:00) en la pantalla "Resúmenes", con exportación a PDF; el envío por Telegram llega en la Fase 3
- Presupuestos mensuales por categoría con alertas al 80% y 100%; plantilla 50/30/20 editable
- Pruebas: balance, tasa de ahorro, variación %, conversión de moneda, cortes de semana y mes en hora de Cancún

## Fase 2 — Mercados ⬜

**Entregable:** veo todos mis activos clave.

- Verificar límites y términos vigentes de las fuentes de datos y elegir la combinación final (§5.3); guiarte para sacar las claves
- Servidor con caché que reparte los datos, con fuente, hora y retraso de cada dato
- Watchlist principal fija (§4) + watchlist personal editable
- Tarjetas con precio, cambio del día en $ y %, mini gráfica y color verde/rojo
- Gráfica detallada (1D, 5D, 1M, 6M, YTD, 1A, 5A, Máx), de línea y de velas; indicadores opcionales: medias móviles de 50 y 200, RSI, MACD y volumen
- Comparador "base 100" y rendimientos por periodo (1M, 3M, YTD, 1A, 3A, 5A) con CAGR
- Estado del mercado (abierto, cerrado, pre-apertura) con horarios de NYSE convertidos a hora de Cancún y días festivos
- Página por empresa: precio, gráfica y fecha del próximo reporte de resultados (noticias en Fase 3, fundamentales en Fase 4)
- Pruebas: indicadores técnicos, base 100, CAGR y conversión de horarios Nueva York → Cancún

## Fase 3 — Noticias y señales ⬜

**Entregable:** me llegan avisos al celular.

- Feed financiero (§5.1) con titular, fuente, hora, activos relacionados y enlace; filtros, leída y guardar; resumen en español con IA *(opcional)*
- Calendario económico: Fed (FOMC), Banxico, inflación (CPI, INPC), empleo, PIB y reportes de las empresas más grandes
- Bot personal de Telegram (solo responde a tu chat) + Web Push en la PWA
- Pre-apertura (~1 hora antes de que abra NYSE, días hábiles) y cierre del día
- Alertas configurables: movimiento intradía fuerte, precio, noticias de alto impacto y recordatorio de aportación mensual (§5.2)
- Anti-spam: horario de silencio, máximo de alertas por hora, agrupar noticias similares y niveles de prioridad
- Panel "Señales" para activar o desactivar cada tipo de alerta
- Envío por Telegram de los resúmenes semanal y mensual

## Fase 4 — Inversión S&P 500 ⬜

**Entregable:** controlo y entiendo mi inversión.

- Portafolio (§6.1): compras con fecha, ETF, títulos fraccionados, precio, comisión y tipo de cambio; total invertido, valor actual, ganancia en USD y MXN (separando mercado y tipo de cambio), costo promedio, rendimiento total, XIRR y dividendos; gráfica "lo que he aportado" vs "lo que vale hoy"; meses seguidos invirtiendo
- Las 10 calculadoras de §6.2, cada una con su fórmula, una explicación sencilla y pruebas unitarias
- Simulador histórico con datos reales del índice
- Guía para principiantes (§6.3), incluida la sección de impuestos en México con fuente, fecha de revisión y la nota "verifica con tu contador"
- Análisis fundamental con semáforo (§6.4) y comparación contra competidores y sector

## Fase 5 — Trading ⬜

**Entregable:** practico con método.

- Simulador (paper trading) con capital ficticio y precios reales, con el aviso de riesgo de §7.1
- Regla de riesgo de 1–2% por operación y límites de pérdida diaria y semanal que bloquean nuevas operaciones
- Diario de trading y estadísticas automáticas (§7.2)
- Calculadoras de §7.3 con pruebas unitarias
- Checklist antes de operar, plan de trading, lecciones cortas y revisión semanal guiada (§7.4)

## Fase 6 — Pulido ⬜

**Entregable:** versión completa.

- La Bóveda: metas de ahorro (fórmula 9 de §6.2) y fondo de emergencia de 3 a 6 meses de gastos esenciales
- Tarjetas de crédito: fechas de corte y límite de pago, pago para no generar intereses, pago mínimo, recordatorios 5 días y 1 día antes, y explicación del CAT
- Deudas: simulador avalancha vs bola de nieve
- Suscripciones: costo mensual y anual, aviso antes de cada cobro
- Calendario financiero en una sola vista *(propuesta: aquí, porque junta tarjetas, recurrentes y eventos económicos)*
- Resumen anual *(propuesta: aquí, o antes si se acerca el cierre de año)*
- Exportar e importar CSV/Excel; respaldo automático
- Observaciones sobre tus hábitos escritas por IA (API de Anthropic, clave solo en el servidor) *(opcional)*
- Modo claro, rendimiento y pulido general
- Inicio de sesión con passkey (Face ID o huella) cuando Supabase lo marque como estable *(propuesta)*
