# Hoja de ruta — Bóveda

Regla: no se empieza una fase sin que la anterior esté probada y aprobada por el usuario.
Al cerrar cada fase se informa: qué se hizo, cómo probarlo paso a paso, qué falta y qué se propone mejorar.
Cada avance se publica en https://4mpj88dbtn-hash.github.io/Boveda-/ para verlo en el celular.

Estado: ⬜ pendiente · 🟨 en curso · ✅ aprobada

| Fase | Contenido | Entregable | Estado |
|---|---|---|---|
| 0 — Base | Diseño, componentes base, PIN, datos en el dispositivo, respaldos, sin conexión, publicación | App vacía con el diseño, el PIN y la instalación funcionando | 🟨 |
| 1 — Finanzas | Registro rápido, categorías, cuentas, historial, resúmenes semanal y mensual, presupuestos | Ya puedo usarla a diario | ⬜ |
| 2 — Mercados | Watchlist, gráficas, comparador base 100, estado del mercado | Veo todos mis activos clave | ⬜ |
| 3 — Noticias y señales | Feed, calendario económico, avisos de mercado por Telegram, alertas en la app | Me llegan avisos de mercado al celular | ⬜ |
| 4 — Inversión S&P 500 | Portafolio, calculadoras, guía educativa, fundamentales | Controlo y entiendo mi inversión | ⬜ |
| 5 — Trading | Simulador, diario, estadísticas, calculadoras, guías | Practico con método | ⬜ |
| 6 — Pulido | Metas, deudas, tarjetas, suscripciones, exportación, IA opcional, recordatorio de respaldos, rendimiento | Versión completa | ⬜ |

Las secciones citadas (§) se refieren a [`docs/REQUISITOS.md`](docs/REQUISITOS.md). La adaptación de cada función a una app sin servidor está en [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) §8. Donde los requisitos no dicen en qué fase va algo, la asignación es una propuesta y está marcada así: *(propuesta)*.

---

## Fase 0 — Base 🟨

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
- [ ] Hacer público el repositorio y activar GitHub Pages (los hace el usuario; pasos en el README)
- [ ] Tu prueba y aprobación de la Fase 0

**Cómo se aprueba:** abres la dirección en tu celular, configuras tu PIN, instalas la app y ves el Centro de mando con el diseño. Luego la abres sin internet y sigue funcionando.

## Fase 1 — Finanzas ⬜

**Entregable:** ya puedo usarla a diario.

- Registro rápido (§1.1): botón "+" siempre visible; monto → categoría → guardar; fecha de hoy por defecto; máximo 3 toques y menos de 5 segundos
- Campos completos: tipo, monto, moneda (MXN o USD con tipo de cambio), categoría, subcategoría, método de pago, cuenta, nota, foto del ticket y etiquetas. *(Sin servidor, el tipo de cambio del día se escribe a mano o se toma del último publicado por GitHub Actions cuando exista en la Fase 2.)*
- Categorías predefinidas y editables (§1.1)
- Cuentas (efectivo, bancos, tarjetas, inversiones, cripto, bienes), patrimonio neto y su gráfica mensual (§1.3)
- Transferencias entre cuentas, que no cuentan como gasto ni ingreso *(propuesta)*
- Movimientos recurrentes, "Repetir último" y plantillas
- Historial con búsqueda, edición, eliminación y filtros
- Resúmenes semanal (desde el domingo 20:00) y mensual (desde el día 1, 9:00) en la pantalla "Resúmenes", con exportación a PDF
- Presupuestos mensuales por categoría con alertas al 80% y 100%; plantilla 50/30/20 editable
- Respaldo: incluir todas las tablas nuevas y recordar descargarlo cada semana
- Evaluar cifrar los movimientos con una llave derivada del PIN *(propuesta)*
- Pruebas: balance, tasa de ahorro, variación %, conversión de moneda, cortes de semana y mes en hora de Cancún, respaldo y restauración

## Fase 2 — Mercados ⬜

**Entregable:** veo todos mis activos clave.

- Verificar límites y términos vigentes de las fuentes (§3.3); guiar para sacar las claves y guardarlas en los secretos del repositorio
- Tarea programada en GitHub Actions que baja precios e historial y los publica como JSON con fuente, hora y retraso
- Watchlist principal fija (§2) + watchlist personal editable
- Tarjetas con precio, cambio del día en $ y %, mini gráfica y color verde/rojo
- Gráfica detallada (1D, 5D, 1M, 6M, YTD, 1A, 5A, Máx), de línea y de velas; medias móviles de 50 y 200, RSI, MACD y volumen
- Comparador "base 100" y rendimientos por periodo con CAGR
- Estado del mercado con horarios de NYSE en hora de Cancún y días festivos
- Pruebas: indicadores técnicos, base 100, CAGR y conversión de horarios Nueva York → Cancún

## Fase 3 — Noticias y señales ⬜

**Entregable:** me llegan avisos de mercado al celular.

- Feed financiero y calendario económico armados por GitHub Actions (§3.1)
- Bot personal de Telegram para avisos de mercado: pre-apertura, cierre y movimientos fuertes (§3.2)
- Alertas de precio y de presupuesto dentro de la app; envío manual a Telegram desde la app *(adaptado)*
- Anti-spam: horario de silencio, máximo por hora, agrupar y prioridades
- Panel "Señales" para activar o desactivar cada tipo de alerta

## Fase 4 — Inversión S&P 500 ⬜

**Entregable:** controlo y entiendo mi inversión.

- Portafolio (§4.1) con XIRR, ganancia separada entre mercado y tipo de cambio, y constancia
- Las 10 calculadoras de §4.2, cada una con su fórmula, una explicación sencilla y pruebas unitarias
- Simulador histórico con datos reales publicados por GitHub Actions
- Guía para principiantes (§4.3), con la sección de impuestos citada, fechada y con "verifica con tu contador"
- Análisis fundamental con semáforo (§4.4) para una lista de empresas que se actualiza en GitHub Actions

## Fase 5 — Trading ⬜

**Entregable:** practico con método.

- Simulador con capital ficticio y precios publicados (con su retraso indicado), con el aviso de riesgo de §5.1
- Regla de riesgo de 1–2% y límites de pérdida diaria y semanal que bloquean nuevas operaciones
- Diario de trading y estadísticas automáticas (§5.2)
- Calculadoras de §5.3 con pruebas unitarias
- Checklist, plan de trading, lecciones cortas y revisión semanal guiada (§5.4)

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
