# Hoja de ruta — Bóveda

Regla: no se empieza una fase sin que la anterior esté probada y aprobada por el usuario. El 05/11/2026 pediste seguir con todas las fases sin esperar; cada avance se publica para que lo pruebes cuando quieras.
Al cerrar cada fase se informa: qué se hizo, cómo probarlo paso a paso, qué falta y qué se propone mejorar.
Cada avance se publica en https://4mpj88dbtn-hash.github.io/Boveda-/ para verlo en el celular.

Estado: ⬜ pendiente · 🟨 en curso · ✅ aprobada

| Fase | Contenido | Entregable | Estado |
|---|---|---|---|
| 0 — Base | Diseño, componentes base, PIN, datos en el dispositivo, respaldos, sin conexión, publicación | App vacía con el diseño, el PIN y la instalación funcionando | ✅ |
| 1 — Finanzas | Registro rápido, categorías, cuentas, historial, resúmenes semanal y mensual, presupuestos | Ya puedo usarla a diario | ✅ |
| 2 — Mercados | Watchlist, gráficas, comparador base 100, estado del mercado | Veo todos mis activos clave | ✅ |
| 3 — Noticias y señales | Feed, calendario económico, avisos de mercado por Telegram, alertas en la app | Me llegan avisos de mercado al celular | ✅ |
| 4 — Inversión S&P 500 | Portafolio, calculadoras, guía educativa, fundamentales | Controlo y entiendo mi inversión | ✅ |
| 5 — Trading | Simulador, diario, estadísticas, calculadoras, guías | Practico con método | ✅ |
| 6 — Pulido | Metas, deudas, tarjetas, suscripciones, exportación, IA opcional, recordatorio de respaldos, rendimiento | Versión completa | ⬜ |

Las secciones citadas (§) se refieren a [`docs/REQUISITOS.md`](docs/REQUISITOS.md). La adaptación de cada función a una app sin servidor está en [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) §8. Donde los requisitos no dicen en qué fase va algo, la asignación es una propuesta y está marcada así: *(propuesta)*.

---

## Fase 0 — Base ✅

**Entregable:** app vacía con el diseño, el PIN y la instalación funcionando.

- [x] Leer los requisitos; crear `CLAUDE.md` y `ROADMAP.md`
- [x] Proponer y aprobar arquitectura, tokens de diseño y bocetos del Centro de mando
- [x] Proyecto Next.js 16 + TypeScript + Tailwind 4, con revisión de código (ESLint) y pruebas (Vitest y Playwright)
- [x] Tokens de diseño, tipografías auto-alojadas y modo oscuro
- [x] Componentes base: botones, campos, paneles, montos con números tabulares, aviso educativo, estados vacíos y de error
- [x] Utilidades de dinero (centavos, redondeo, MXN/USD) y fechas (hora de Cancún, semanas de lunes a domingo) con pruebas
- [x] Navegación: barra inferior con "+" central (celular) y barra lateral (escritorio)
- [x] Centro de mando vacío con el encabezado memorable (retícula técnica) y su única secuencia de carga
- [x] Cambio de arquitectura a "sin servidor" (05/11/2026): se quitaron Supabase y Vercel
- [x] Datos en el dispositivo (IndexedDB) con ajustes validados
- [x] Bienvenida con nombre opcional y PIN de 6 dígitos; desbloqueo con espera tras 5 errores; "olvidé mi PIN"
- [x] Ajustes: nombre del saludo, cuándo pedir el PIN, cambiar PIN, bloquear, respaldo (descargar y restaurar), borrar datos
- [x] PWA: manifiesto, íconos, instalable y abre completa sin internet
- [x] GitHub Actions: revisión automática y publicación en GitHub Pages
- [x] `README.md` en español
- [ ] Hacer público el repositorio y activar GitHub Pages (los hace el usuario; pasos en el README). Al 05/11/2026 el repositorio sigue privado
- [x] Aprobación de la Fase 0 (se fusionó a `main` el 05/11/2026)

**Cómo se aprueba:** abres la dirección en tu celular, configuras tu PIN, instalas la app y ves el Centro de mando con el diseño. Luego la abres sin internet y sigue funcionando.

## Fase 1 — Finanzas ✅

**Entregable:** ya puedo usarla a diario. Se entrega en dos partes.

### Parte 1 — lista para probar (05/11/2026)

- [x] Registro rápido (§1.1): botón "+" siempre visible; monto → categoría → guardar; fecha de hoy por defecto; aviso con "Deshacer"
- [x] "Repetir último" para registrar lo mismo otra vez en 2 toques
- [x] Campos: tipo, monto, moneda (MXN o USD con el tipo de cambio que escribes, guardado con su fecha y su fuente), categoría, cuenta, fecha, método de pago, nota y etiquetas
- [x] Categorías predefinidas y editables: nombre, ícono, archivar (§1.1)
- [x] Cuentas (efectivo, bancos, tarjetas, inversiones, cripto, bienes y deudas) con su saldo y patrimonio neto (§1.3)
- [x] Transferencias entre cuentas, que no cuentan como gasto ni ingreso, también entre pesos y dólares
- [x] Historial por mes con búsqueda, filtros, edición y eliminación
- [x] Centro de mando con tu patrimonio neto y los totales del mes
- [x] Base de datos versión 2 con migración probada desde la Fase 0; respaldo versión 2 con todas las tablas que sigue leyendo los de la Fase 0
- [x] Pruebas: saldos, patrimonio, conversión de moneda, totales del mes y de la semana, tasa de ahorro, variación %, validación de movimientos, teclado, migración y respaldo; flujo completo de registrar, deshacer, dólares, editar, cuentas y restaurar
- [x] Pediste continuar con todas las fases (05/11/2026)

### Parte 2 — lista (08/11/2026)

- [x] Resúmenes semanal (domingo 20:00) y mensual (día 1, 9:00) en la pantalla "Resúmenes": totales, comparación contra el periodo anterior y el promedio de 4, top 5 de categorías, gasto diario promedio, día de mayor gasto; el mensual agrega presupuestos, cambio de patrimonio y el mismo mes del año anterior
- [x] Exportar el resumen a PDF (hecho en el dispositivo) y compartirlo como texto por Telegram, WhatsApp o correo
- [x] Presupuestos mensuales por categoría con barra y avisos al 80% y 100% (al registrar y en el Centro de mando); plantilla 50/30/20 editable con tu ingreso promedio
- [x] Movimientos recurrentes (semana, 2 semanas, quincena, mes, año) que se registran solos o piden confirmación; los de dólares siempre piden confirmación
- [x] Plantillas de gastos frecuentes a un toque
- [x] Subcategorías (un nivel) que cuentan dentro de su categoría
- [x] Foto del ticket, comprimida en el dispositivo e incluida en el respaldo
- [x] Gráfica mensual del patrimonio neto
- [x] Recordatorio semanal para descargar el respaldo
- [x] Cifrado con llave del PIN: evaluado y descartado por ahora (razones en `docs/ARQUITECTURA.md` §9)
- [x] Base de datos versión 3 y respaldo versión 3, con pruebas de migración

## Fase 2 — Mercados ✅

**Entregable:** veo todos mis activos clave. Lista el 08/11/2026.

- [x] Fuentes verificadas el 08/11/2026: Yahoo Finance (sin clave, no oficial) para índices, ETFs, acciones, divisas, materias primas, VIX y bono a 10 años; Coinbase (API pública, sin clave) como respaldo de cripto; Banxico SIE (token gratuito) para FIX y tasa objetivo; FRED (clave gratuita) para la tasa de la Fed
- [x] Tarea de GitHub Actions cada 20 minutos en horario de mercado y cada 3 horas fuera de él; publica `datos/` junto a la app con fuente, hora y retraso de cada dato; si una fuente falla se conserva el último dato con su hora
- [x] Watchlist principal fija (§2) + watchlist personal (ETFs, acciones de EE. UU. y México, cripto)
- [x] Tarjetas con precio, cambio del día en $ y %, mini gráfica y color verde/rojo
- [x] Gráfica detallada 1D, 5D, 1M, 6M, YTD, 1A, 5A y Máx, de línea y de velas, con MA50, MA200, RSI, MACD y volumen (TradingView Lightweight Charts)
- [x] Comparador base 100 y rendimientos 1M, 3M, YTD, 1A, 3A, 5A con CAGR
- [x] Estado del mercado con horarios de NYSE en hora de Cancún, festivos y cierres anticipados
- [x] Cinta de mercados en el Centro de mando
- [x] Pruebas: indicadores, base 100, CAGR, rendimientos, horario NYSE → Cancún con festivos, lectura de cada fuente
- [ ] Tú: guardar `BANXICO_TOKEN` y `FRED_API_KEY` en los secretos del repositorio para FIX, tasa objetivo y tasa de la Fed (pasos en el README)
- [ ] Tú: fusionar a `main` para que la actualización programada corra sola (GitHub solo programa tareas en la rama principal)

## Fase 3 — Noticias y señales ✅

**Entregable:** me llegan avisos de mercado al celular. Lista el 08/11/2026.

- [x] Noticias de fuentes públicas verificadas desde GitHub Actions el 08/11/2026: Reserva Federal, Yahoo Finance, CNBC, MarketWatch, El Economista, El Financiero, Expansión, CoinDesk y Google Noticias (Banxico). Con tema, activos relacionados, prioridad (crítica, importante, informativa) y agrupación de la misma noticia en varias fuentes. No se usan las que bloquean bots (BLS, Cointelegraph)
- [x] Filtros por tema y activo, marcar como leída y guardar
- [x] Calendario económico oficial: reuniones del FOMC (Reserva Federal), PIB y PCE (BEA); con clave gratuita, inflación CPI y empleo (FRED) y resultados de empresas grandes (Finnhub). Banxico no publica su calendario en un formato que se pueda leer: se enlaza el oficial y sus anuncios llegan a Noticias
- [x] Avisos por Telegram desde GitHub Actions: pre-apertura, cierre, movimientos fuertes (S&P 500 y Nasdaq ±1.5%, BTC ±5%, USD/MXN ±1%, editables), noticias de alto impacto, alertas de precio y recordatorio de aportación
- [x] Anti-spam: horario de silencio, máximo por hora, prioridades y avisos agrupados
- [x] Panel "Señales": señales recientes, alertas de precio del dispositivo y generador de la configuración de Telegram
- [x] Notificaciones push del navegador: evaluadas y descartadas por ahora (necesitan un servicio que guarde tu suscripción); Telegram cubre los avisos
- [ ] Tú: crear el bot y guardar `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` y la variable `SENALES_CONFIG` (pasos en Señales y en el README)

## Fase 4 — Inversión S&P 500 ✅

**Entregable:** controlo y entiendo mi inversión. Lista el 08/11/2026.

- [x] Portafolio (§4.1): compras con fecha, ETF (VOO, IVV, SPY y otros 7), títulos con fracciones, precio, comisión y tipo de cambio; dividendos recibidos. Muestra aportado, valor de hoy, ganancia en USD y MXN separada entre mercado y tipo de cambio, costo promedio, rendimiento total, XIRR, dividendos, gráfica "aportado vs lo que vale" y meses seguidos invirtiendo
- [x] Las 10 calculadoras de §4.2, cada una con su fórmula, explicación sencilla y pruebas con casos verificados a mano
- [x] Simulador histórico con la serie del S&P 500 con dividendos reinvertidos (^SP500TR, Yahoo Finance), publicada por GitHub Actions
- [x] Guía (§4.3): S&P 500, ETFs y sus comisiones (revisadas el 08/11/2026), cómo invertir desde México, DCA, reglas de oro, riesgo cambiario, impuestos citados y fechados con tasa editable y "verifica con tu contador", indicadores del momento y glosario con búsqueda
- [x] Empresas (§4.4): 21 empresas grandes con semáforo contra la mediana de su sector (o de la lista) en valuación, rentabilidad, crecimiento, salud financiera y dividendos, actualizadas una vez al día por GitHub Actions con Finnhub
- [x] Portafolio en el Centro de mando; compras y dividendos entran en el respaldo (formato 4)
- Límites: el P/E estimado y el historial de dividendos por empresa no vienen en el plan gratuito de Finnhub; el P/E del S&P 500 y el CAPE de Shiller no tienen fuente gratuita confiable (la guía enlaza multpl.com)
- [ ] Tú: guardar `FINNHUB_API_KEY` en los secretos del repositorio para ver Empresas (pasos en el README)

## Fase 5 — Trading ✅

**Entregable:** practico con método. Lista el 08/11/2026.

- [x] Simulador con $10,000 USD ficticios (editable) y los precios que publica GitHub Actions, con su hora y antigüedad: ETFs y acciones de EE. UU. con la Bolsa de Nueva York abierta, cripto a toda hora. Stops y objetivos se revisan solos con las velas de 5 y 30 minutos (y diarias); si una vela toca los dos, cuenta el stop
- [x] Aviso de riesgo de §5.1 siempre visible, con la fuente (ESMA, 27/03/2018: entre 74% y 89% de las cuentas minoristas de CFD perdían dinero) y la sugerencia de practicar 2–3 meses y usar máximo 5–10% del capital
- [x] Regla de riesgo (1% por operación de inicio, máximo 2%): el tamaño de posición se calcula solo y no deja arriesgar de más. Límites de pérdida de 3% al día y 6% a la semana *(propuesta, editables)* que bloquean nuevas operaciones
- [x] Checklist obligatorio antes de entrar (§5.4), con los datos fuertes del día tomados del calendario económico
- [x] Diario (§5.2): activo, dirección, estrategia, entrada, stop, objetivo, tamaño, resultado en dinero y en R, captura de la gráfica, emoción, ¿seguí mi plan? y lección. También registra operaciones reales hechas en tu casa de bolsa
- [x] Estadísticas automáticas: % de aciertos, ganancia y pérdida promedio, riesgo/beneficio real, esperanza, factor de beneficio, rachas, drawdown máximo, curva de capital y resultados por estrategia, día, hora, emoción y plan
- [x] Las calculadoras de §5.3 con su fórmula y pruebas con casos verificados a mano
- [x] Plan de trading escrito, 12 lecciones cortas y revisión semanal con preguntas guiadas
- [x] Operaciones, capturas y revisiones entran en el respaldo (formato 5)

## Fase 6 — Pulido ⬜

**Entregable:** versión completa.

- La Bóveda: metas de ahorro y fondo de emergencia
- Tarjetas de crédito con recordatorios dentro de la app y explicación del CAT
- Deudas: simulador avalancha vs bola de nieve
- Suscripciones y calendario financiero
- Resumen anual
- Exportar e importar CSV/Excel; recordatorio semanal de respaldo
- Observaciones con IA *(opcional; sin servidor requiere tu propia clave guardada solo en el dispositivo)*
- Desbloqueo con Face ID o huella (passkey local) *(propuesta)*
- Modo claro, rendimiento y pulido general
