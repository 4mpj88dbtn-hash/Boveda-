# Requisitos de Bóveda

Requisitos funcionales del prompt maestro v1.0, sin los datos personales de su autor. El documento original quedó fuera del repositorio porque el repositorio es público.

> **Decisión del 05/11/2026:** la app funciona sin servidor (sin Supabase ni Vercel). Lo que dependía de un servidor se adapta como indica [`ARQUITECTURA.md`](ARQUITECTURA.md). Las notas *(adaptado)* señalan esos cambios.

Las fórmulas deben implementarse tal cual y con pruebas unitarias.

## 1. Mis finanzas (el corazón de la app)

### 1.1 Registro rápido de ingresos y gastos

- Botón "+" siempre visible. Flujo: monto → categoría (íconos grandes) → guardar. Fecha de hoy por defecto. Máximo 3 toques y menos de 5 segundos.
- Campos: tipo (ingreso o gasto), monto, moneda (MXN o USD, con conversión automática al tipo de cambio del día), categoría, subcategoría opcional, método de pago (efectivo, débito, tarjeta de crédito, transferencia), cuenta, nota, foto del ticket opcional y etiquetas.
- Categorías predefinidas y editables:
  - **Gastos:** Comida, Súper, Restaurantes, Transporte/Gasolina, Casa/Renta, Servicios (luz, agua, internet, teléfono), Salud, Educación, Entretenimiento, Ropa, Suscripciones, Deudas, Regalos, Otros.
  - **Ingresos:** Honorarios, Salario, Negocio, Inversiones/Dividendos, Ventas, Otros.
- Movimientos recurrentes (renta, suscripciones, pagos fijos) que se registran solos o piden confirmación.
- "Repetir último" y plantillas de gastos frecuentes.
- Historial con búsqueda, edición, eliminación y filtros por fecha, categoría y cuenta.

### 1.2 Resúmenes automáticos

- **Semanal**, domingo 20:00 (hora de Cancún): total ganado, total gastado, balance, tasa de ahorro, top 5 categorías de gasto, comparación contra la semana anterior y contra el promedio de las últimas 4 semanas, gasto diario promedio y día de mayor gasto.
- **Mensual**, día 1 a las 9:00: lo mismo a nivel mes, más avance de presupuestos y metas, cambio en patrimonio neto y comparación con el mismo mes del año anterior cuando haya datos.
- **Anual**, al cierre de año.
- Entrega: pantalla "Resúmenes" en la app, mensaje por Telegram y exportación a PDF. *(Adaptado: sin servidor, el resumen aparece en la app desde la hora indicada; Telegram solo al enviarlo desde la app.)*
- Opcional, fase posterior: 2–3 observaciones concretas sobre los hábitos, escritas por IA con la API de Anthropic.

Fórmulas:

- Balance = Ingresos − Gastos
- Tasa de ahorro = (Ingresos − Gastos) / Ingresos × 100
- Variación % = (Periodo actual − Periodo anterior) / Periodo anterior × 100

### 1.3 Todo lo demás que necesita una persona

- **Cuentas y patrimonio neto:** efectivo, bancos, tarjetas, inversiones, cripto, bienes. Patrimonio neto = Activos − Pasivos, con gráfica de evolución mensual.
- **Presupuestos** mensuales por categoría con barra de progreso y alertas al 80% y 100%. Plantilla sugerida 50/30/20 (necesidades / deseos / ahorro e inversión), editable.
- **Fondo de emergencia:** meta de 3 a 6 meses de gastos esenciales, calculada con el promedio real, con barra de avance.
- **Metas de ahorro** con fecha objetivo y aportación mensual necesaria (simple o con rendimiento, con la fórmula 9 de la sección 4.2).
- **Tarjetas de crédito:** fecha de corte, fecha límite de pago, pago para no generar intereses, pago mínimo, recordatorios 5 días y 1 día antes. Explicación clara de por qué pagar solo el mínimo sale carísimo (CAT).
- **Deudas:** saldo, tasa y pago de cada una; simulador avalancha (primero la tasa más alta) vs bola de nieve (primero el saldo más chico), con fecha de liquidación e intereses totales de cada método.
- **Suscripciones:** costo mensual y anual total, aviso antes de cada cobro.
- **Calendario financiero:** pagos, cortes, cobros recurrentes y eventos económicos en una sola vista.
- Exportar e importar CSV/Excel; respaldo automático.

## 2. Mercados y gráficas

Watchlist principal (fija) más una watchlist personal editable:

| Activo | Referencia |
|---|---|
| S&P 500 | Índice y ETFs VOO / IVV / SPY |
| Nasdaq | Nasdaq Composite y Nasdaq-100 (QQQ) |
| Dow Jones | Índice |
| Bolsa mexicana | S&P/BMV IPC |
| Cripto | Bitcoin, Ethereum |
| Dólar vs peso | USD/MXN spot + FIX de Banxico |
| Índice dólar | DXY |
| Materias primas | Oro, petróleo WTI |
| Volatilidad | VIX |
| Tasas | Bono del Tesoro de EE. UU. a 10 años, tasa de la Fed, tasa objetivo de Banxico |

- Tarjetas con precio, cambio del día en $ y %, mini gráfica y color verde o rojo.
- Gráfica detallada con periodos 1D, 5D, 1M, 6M, YTD, 1A, 5A y Máx, de línea y de velas. Indicadores opcionales: medias móviles de 50 y 200, RSI, MACD y volumen.
- **Comparador "base 100":** varios activos normalizados a 100 en la fecha inicial para comparar rendimientos (por ejemplo, S&P 500 vs Nasdaq vs Bitcoin vs USD/MXN en el último año).
- Rendimientos por periodo (1M, 3M, YTD, 1A, 3A, 5A) y CAGR.
- **Estado del mercado** (abierto, cerrado, pre-apertura) con los horarios de NYSE convertidos de `America/New_York` a `America/Cancun`. Como Cancún no cambia de horario, la apertura es a las 8:30 a.m. durante el horario de verano de EE. UU. y a las 9:30 a.m. en invierno. Incluir los días festivos del mercado.
- Página por empresa: precio, gráfica, fundamentales (sección 4.4), noticias y fecha del próximo reporte de resultados.
- Cada dato muestra su fuente y la hora de su última actualización. Si tiene retraso (por ejemplo, 15 minutos en planes gratuitos), se indica claramente.

## 3. Noticias y notificaciones

### 3.1 Noticias

- Feed financiero actualizado continuamente: mercado general, Fed y Banxico, economía de EE. UU. y México, cripto y noticias de los activos de la watchlist.
- Cada noticia: titular, fuente, hora, activos relacionados y enlace al original. Resumen breve en español generado por IA (opcional).
- Filtros por tema y activo; marcar como leída; guardar.
- **Calendario económico:** decisiones de la Fed (FOMC) y Banxico, inflación (CPI de EE. UU., INPC de México), empleo (nóminas no agrícolas), PIB y reportes de resultados de las empresas más grandes.

### 3.2 Notificaciones (Telegram y push)

- **Pre-apertura** cada día hábil, ~1 hora antes de que abra NYSE: futuros, noticias clave de la noche y eventos del día.
- **Cierre:** cómo terminaron S&P 500, Nasdaq, IPC, BTC, USD/MXN y el portafolio.
- **Alertas al momento** (configurables):
  - Movimiento intradía fuerte: S&P 500 o Nasdaq ±1.5%, BTC ±5%, USD/MXN ±1%, o el porcentaje que se defina por activo.
  - Alertas de precio: "avísame si VOO baja de X" o "si BTC supera Y".
  - Noticias de alto impacto (Fed, Banxico, inflación, eventos mayores) y de los activos de la watchlist.
  - Recordatorio de la aportación mensual al S&P 500.
- **Anti-spam:** horario de silencio (por ejemplo 23:00–7:00), máximo de alertas por hora, agrupar noticias similares y niveles de prioridad (crítica / importante / informativa).
- Panel en la app para activar o desactivar cada tipo de alerta.

*(Adaptado: sin servidor, las alertas que no usan datos personales, como mercado, pre-apertura y cierre, las envía una tarea programada de GitHub Actions; las que dependen de tus datos se ven al abrir la app.)*

### 3.3 Fuentes de datos

Evaluar, verificar límites y términos vigentes, y proponer la mejor combinación gratuita o de bajo costo:

- Acciones, índices, noticias y calendario: Finnhub, Twelve Data, Financial Modeling Prep, Alpha Vantage o Polygon.
- Cripto: CoinGecko y/o WebSocket público de un exchange para tiempo real.
- Tipo de cambio: API SIE de Banxico (FIX oficial) + una fuente spot.
- Macro de EE. UU.: FRED. Macro de México: Banxico e INEGI.
- Noticias complementarias: RSS de medios financieros.
- Atajo para la fase inicial: widgets embebibles de TradingView.
- El navegador nunca llama directo a APIs con claves; algo con caché reparte los datos y respeta los límites de peticiones. Explicar qué claves se necesitan y cómo obtenerlas. *(Adaptado: ese papel lo hace GitHub Actions, con las claves en los secretos del repositorio.)*

## 4. Inversión mensual en el S&P 500 (plan principal)

### 4.1 Mi portafolio

- Registrar cada compra: fecha, ETF, número de títulos (permitir fracciones), precio, comisión y tipo de cambio del día.
- Mostrar: total invertido, valor actual, ganancia o pérdida en USD y en MXN (separando cuánto viene del mercado y cuánto del tipo de cambio), costo promedio por título, rendimiento total, rendimiento anualizado (XIRR) y dividendos recibidos.
- Gráfica "lo que he aportado" vs "lo que vale hoy" a lo largo del tiempo.
- Indicador de constancia: meses seguidos invirtiendo.

### 4.2 Calculadoras con fórmulas establecidas

Cada calculadora muestra la fórmula y una explicación sencilla. Todas con pruebas unitarias.

1. **Interés compuesto con aportaciones mensuales** (valor futuro de una anualidad): `VF = VP × (1 + i)^n + A × [((1 + i)^n − 1) / i]`
   - `i` = tasa mensual = `(1 + tasa anual)^(1/12) − 1`
   - `n` = número de meses, `A` = aportación mensual, `VP` = capital inicial
   - Si la aportación se hace al inicio del mes, el segundo término se multiplica por `(1 + i)`.
2. **Tres escenarios a la vez:** conservador, moderado y optimista (editables; por defecto 6%, 8% y 10% anual nominal). Gráfica y tabla año por año con "aportado" vs "rendimientos ganados".
3. **Rendimiento real** (descontando inflación): `r_real = (1 + r_nominal) / (1 + inflación) − 1`. Mostrar las proyecciones también en pesos de hoy.
4. **CAGR:** `(Valor final / Valor inicial)^(1 / años) − 1`.
5. **XIRR:** rendimiento anualizado real considerando la fecha de cada aportación.
6. **Regla del 72:** años para duplicar ≈ `72 / tasa anual %`.
7. **Costo promedio (DCA):** `Total invertido / Total de títulos`.
8. **Impacto de comisiones:** valor final con distintas comisiones anuales (0.03% vs 0.5% vs 1.5%) a 20 y 30 años.
9. **¿Cuánto invertir al mes para llegar a $X en N años?** `A = (VF − VP × (1 + i)^n) × i / ((1 + i)^n − 1)`
10. **Simulador histórico:** "si hubiera invertido $X cada mes desde el año Y", con datos históricos reales del índice (dividendos reinvertidos si la fuente lo permite).

### 4.3 Guía para principiantes

Contenido en tarjetas cortas y claras:

- Qué es el S&P 500 y por qué se usa para el largo plazo. Qué es un ETF y las diferencias entre VOO, IVV y SPY (comisión anual, liquidez).
- Cómo invertir desde México: casas de bolsa mexicanas con acceso al SIC (Sistema Internacional de Cotizaciones) vs brókers internacionales. Qué comparar: comisiones, custodia, monto mínimo, títulos fraccionados, regulación y protección de la cuenta.
- Inversión periódica (DCA): por qué invertir la misma cantidad cada mes reduce el riesgo de entrar en mal momento.
- Reglas de oro: fondo de emergencia primero; no invertir dinero que se necesitará en menos de 5 años; horizonte largo; no vender en pánico; reinvertir dividendos; rebalancear; diversificar.
- Riesgo cambiario: el ETF cotiza en dólares; si el peso se fortalece, el rendimiento en pesos baja, y al revés.
- Impuestos en México (sección informativa con fecha de última revisión): tratamiento de ganancias en BMV/SIC, dividendos de emisoras extranjeras y constancia fiscal anual de la casa de bolsa. Las tasas son configurables, se citan con su fuente y llevan la nota "verifica con tu contador". No inventarlas.
- Indicadores del momento del mercado: P/E del S&P 500 y CAPE de Shiller, bono a 10 años, VIX, tasa de la Fed, inflación.
- Glosario con búsqueda.

### 4.4 Análisis fundamental de empresas

Para cada empresa, mostrar e interpretar con semáforo y una línea de explicación:

- **Valuación:** P/E actual y estimado, PEG, P/B, EV/EBITDA.
- **Rentabilidad:** márgenes bruto, operativo y neto; ROE; ROIC.
- **Crecimiento:** ventas y utilidad por acción (EPS) a 1, 3 y 5 años.
- **Salud financiera:** deuda/capital, liquidez corriente, flujo de caja libre.
- **Dividendos:** rendimiento, payout ratio, historial.
- Comparación contra competidores y contra el promedio de su sector.

## 5. Trading (aprender con disciplina)

### 5.1 Primero, modo práctica

- Simulador (paper trading) con capital ficticio y precios reales. Sugerir usarlo al menos 2–3 meses con resultados consistentes antes de arriesgar dinero real.
- Aviso visible: la mayoría de los traders minoristas pierden dinero. El trading debe ser una parte pequeña del capital (sugerencia: máximo 5–10%), separada de la inversión de largo plazo en el S&P 500.

### 5.2 Diario de trading

- Cada operación: activo, dirección, estrategia, entrada, stop loss, objetivo, tamaño, resultado, captura de la gráfica, emoción (calma, miedo, FOMO, euforia), ¿seguí mi plan? (sí/no) y lección aprendida.
- Estadísticas automáticas: % de aciertos, ganancia promedio vs pérdida promedio, relación riesgo/beneficio, esperanza matemática, factor de beneficio, rachas, drawdown máximo, curva de capital y resultados por estrategia, día y hora.

### 5.3 Calculadoras de trading

- **Tamaño de posición:** `Títulos = (Capital × % de riesgo) / (Entrada − Stop loss)`
- **Riesgo/beneficio:** `(Objetivo − Entrada) / (Entrada − Stop)`. Mínimo sugerido 1:2.
- **Esperanza:** `E = (% aciertos × ganancia promedio) − (% pérdidas × pérdida promedio)`
- **Factor de beneficio:** `Ganancias brutas / Pérdidas brutas`
- **Drawdown máximo:** `(Pico − Valle) / Pico`
- **Regla de riesgo:** no arriesgar más del 1–2% del capital de trading por operación. Límite de pérdida diaria y semanal que bloquea nuevas operaciones en el simulador.

### 5.4 Procesos y guías

- Checklist antes de cada operación: tendencia, nivel clave, confirmación, stop definido, tamaño calculado, riesgo/beneficio ≥ 1:2, ¿hay datos económicos o noticias fuertes hoy?
- Plan de trading escrito dentro de la app: qué se opera, en qué horario, reglas de entrada y salida, riesgo máximo.
- Lecciones cortas: tipos de órdenes (mercado, limitada, stop, stop-limit, trailing stop), soportes y resistencias, tendencias, medias móviles, RSI, MACD, volumen, velas japonesas, temporalidades, apalancamiento y sus riesgos, cripto 24/7 y su volatilidad, psicología (FOMO, operar por revancha, sobreoperar).
- Revisión semanal del diario con preguntas guiadas.

## 6. Seguridad y calidad

Requisitos originales, con su adaptación a una app sin servidor:

- Autenticación obligatoria (passkey o 2FA). *(Adaptado: PIN de 6 dígitos en el dispositivo; passkey con Face ID o huella como mejora futura.)*
- HTTPS (GitHub Pages lo da). Las claves de API nunca están en el navegador ni en el repositorio.
- Respaldos y exportación completa de los datos.
- Las APIs de mercado nunca reciben datos personales. Los registros de errores no guardan información sensible.
- Registrar un gasto desde el celular: máximo 3 toques y menos de 5 segundos.
- Fórmulas con pruebas unitarias y casos verificados a mano.
- Todo dato de mercado muestra fuente y hora de actualización.
- Si falla una fuente de mercado, el resto de la app sigue funcionando.
- Código tipado, organizado por módulos, con `README.md` en español.
