# Diseño de Bóveda

> **Estado: propuesta pendiente de aprobación** (05/11/2026). Tokens y bocetos del Centro de mando según §8 del SPEC.

**Concepto:** banca privada de día, centro de mando de noche. La sobriedad de una oficina ejecutiva de lujo con la precisión de una sala de control subterránea. Poderoso, discreto, exacto; nada caricaturesco. Es solo una inspiración de estilo: sin logotipos, murciélagos, nombres ni recursos de DC/Warner.

## 1. Colores (modo oscuro, por defecto)

| Token | Nombre | Valor | Uso |
|---|---|---|---|
| `--fondo` | Grafito profundo | `#0D0F12` | Fondo de la app |
| `--superficie` | Acero pavonado | `#161A1F` | Tarjetas y paneles |
| `--superficie-elevada` | Superficie elevada | `#1F242B` | Hojas, menús, elementos encima de tarjetas |
| `--borde` | Líneas y bordes | `#2B3139` | Divisores decorativos |
| `--borde-control` | Borde de control *(nuevo)* | `#6A727D` | Contorno de campos y controles |
| `--texto` | Marfil | `#ECE8E1` | Texto principal |
| `--texto-secundario` | Gris niebla | `#8C939C` | Texto secundario, fuente y hora de datos |
| `--laton` | Latón envejecido | `#B8955A` | Cifras clave, acción principal, foco del teclado. Con moderación |
| `--acero` | Acero azulado | `#4E8CC2` | Solo líneas de gráficas y retícula técnica |
| `--positivo` | Jade | `#3DAA82` | Subidas, ingresos |
| `--negativo` | Carmesí | `#D9454B` | Bajadas y gastos en barras, líneas y rellenos |
| `--negativo-texto` | Carmesí para texto *(nuevo)* | `#E5676B` | Cifras negativas en texto pequeño |

### Contraste verificado (WCAG 2.1)

Calculado con la fórmula oficial de WCAG. Meta: 4.5:1 para texto normal y 3:1 para texto grande, gráficas y contornos de controles.

| Color | Sobre fondo | Sobre superficie | Sobre elevada | Resultado |
|---|---|---|---|---|
| Marfil `#ECE8E1` | 15.72 | 14.31 | 12.78 | ✅ texto |
| Gris niebla `#8C939C` | 6.19 | 5.63 | 5.03 | ✅ texto |
| Latón `#B8955A` | 6.84 | 6.23 | 5.56 | ✅ texto |
| Jade `#3DAA82` | 6.64 | 6.05 | 5.40 | ✅ texto |
| Acero azulado `#4E8CC2` | 5.35 | 4.87 | 4.35 | ✅ gráficas (su único uso) |
| Carmesí `#D9454B` | 4.48 | 4.08 | 3.64 | ⚠️ no alcanza 4.5 para texto pequeño → solo barras, líneas y rellenos |
| Carmesí texto `#E5676B` | 5.93 | 5.40 | 4.82 | ✅ texto |
| Bordes `#2B3139` | 1.46 | 1.33 | 1.19 | Solo divisores decorativos |
| Borde de control `#6A727D` | 3.94 | 3.59 | 3.21 | ✅ contorno de controles |

Botón de latón con texto grafito: 6.84:1 ✅.

**Por qué dos tokens nuevos:** el carmesí original no es legible como texto pequeño en ninguna superficie, y los bordes `#2B3139` son tan tenues que un campo de texto sería difícil de distinguir. Los dos nuevos tokens mantienen el carácter de la paleta y cumplen AA.

**Modo claro (opcional):** se diseñará en la Fase 6 con la misma lógica de contraste.

## 2. Tipografía

| Rol | Familia | Por qué |
|---|---|---|
| Cifras grandes y títulos | **Cormorant Garamond** (500 y 600) | Serif de alto contraste y aire clásico: el patrimonio se lee como un estado de cuenta de banca privada |
| Interfaz y texto | **IBM Plex Sans** (400, 500 y 600) | Grotesca precisa, de origen técnico; lee muy bien en español en pantallas pequeñas |

**Números tabulares verificados** (revisando los archivos de las fuentes el 05/11/2026):

- Cormorant Garamond incluye números tabulares (`tnum`) y de altura uniforme (`lnum`). Sus cifras por defecto son proporcionales y de estilo antiguo (en una prueba visual, el "0" de "Fase 0" parecía una "o"). Por eso los montos usan `font-variant-numeric: lining-nums tabular-nums` y todo título en serif usa al menos `lining-nums`.
- IBM Plex Sans ya trae cifras tabulares por defecto (todas miden lo mismo).
- Alternativa evaluada: Bodoni Moda + Geist (ambas tienen `tnum`). Bodoni Moda se siente más de revista de moda y Geist más de startup; para "banca privada + sala de control" recomiendo Cormorant + Plex.

### Escala tipográfica

| Token | Celular | Escritorio | Familia y peso | Uso |
|---|---|---|---|---|
| `hero` | 44 px | 64 px | Cormorant 600, interlineado 1.0 | Patrimonio neto en el Centro de mando |
| `display` | 30 px | 36 px | Cormorant 600, 1.1 | Título de cada pantalla |
| `titulo` | 22 px | 24 px | Cormorant 600, 1.2 | Títulos de sección |
| `cifra` | 24 px | 28 px | Cormorant 600, 1.1 | Montos destacados en tarjetas |
| `cuerpo` | 16 px | 16 px | Plex Sans 400, 1.5 | Texto y campos (16 px evita el zoom en iPhone) |
| `interfaz` | 15 px | 15 px | Plex Sans 500, 1.4 | Botones, listas, navegación |
| `etiqueta` | 13 px | 13 px | Plex Sans 500, 1.3 | Etiquetas de campos y columnas |
| `nota` | 12 px | 12 px | Plex Sans 400, 1.3 | Fuente y hora de los datos, aviso educativo |

Párrafos con un ancho máximo de 70 caracteres. Sin texto todo en mayúsculas.

### Formato de cifras (verificado con `Intl` es-MX)

- MXN: `$1,234.56` · USD: `USD 1,234.56` · negativo: `-$1,234.56`
- Porcentajes: `+1.25%` (el signo siempre visible en variaciones)
- Fechas: `05/11/2026`

## 3. Espaciado, forma y profundidad

- **Espaciado (base 4 px):** 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64. Margen lateral de 16 px en celular y 32 px en escritorio; separación de 16 px entre tarjetas en celular y 24 px en escritorio.
- **Radios:** 4 px en controles, 8 px en tarjetas, 16 px en la parte superior de la hoja de registro rápido.
- **Profundidad:** las capas se distinguen por el tono de la superficie y un borde de 1 px, no por sombras. Solo los elementos flotantes (botón "+", hoja de registro) llevan una sombra profunda y suave.
- **Áreas táctiles:** mínimo 44 × 44 px; el botón "+" mide 56 px.
- **Foco con teclado:** contorno de latón de 2 px separado 2 px del elemento.
- **Íconos:** Lucide (incluidos con shadcn/ui), trazo de 1.5 px, 20 o 24 px.

## 4. Movimiento

| Token | Duración | Uso |
|---|---|---|
| `rapido` | 120 ms | Respuesta al toque, confirmar "Gasto guardado" |
| `medio` | 200 ms | Abrir un detalle o la hoja de registro |
| `carga` | 700 ms | Única secuencia de carga del Centro de mando (una vez por sesión) |

Curva: `cubic-bezier(0.2, 0, 0, 1)`. Con "reducir movimiento" activado no hay animaciones: todo aparece al instante.

## 5. El elemento memorable: encabezado del Centro de mando

- El patrimonio neto en Cormorant Garamond 600 (token `hero`), en marfil, con la variación del mes debajo en jade o carmesí.
- Detrás, una retícula técnica: líneas de 1 px cada 24 px en acero azulado a ~6% de opacidad, como una pantalla de control apagada.
- **Reacción al cursor o al toque:** alrededor del punto donde está el cursor o el dedo, las líneas de la retícula se iluminan levemente (latón al ~20%) en un halo de unos 160 px y aparece una mira muy fina. Al soltar, se desvanece en 200 ms.
- **Secuencia de carga (una sola vez por sesión):** la retícula se enciende de izquierda a derecha y la cifra pasa de desenfocada a nítida en 700 ms.
- Con "reducir movimiento": retícula estática, sin halo ni secuencia.
- Todo lo demás de la app es sobrio y disciplinado.

## 6. Navegación

- **Celular:** barra inferior con 6 espacios iguales: Mando · Finanzas · **+** · Mercados · Inversión · Trading. El "+" es un círculo de latón elevado de 56 px; queda medio espacio a la izquierda del centro exacto porque son 5 secciones más el botón.
- **Escritorio (≥ 1024 px):** barra lateral con las 5 secciones, "Señales" y "La Bóveda", y el botón "Registrar"; el contenido es una cuadrícula tipo sala de control.
- "Señales" también se abre desde la campana del encabezado; "La Bóveda" vive dentro de Finanzas en el celular.

## 7. Bocetos del Centro de mando

> Cifras ficticias, solo para mostrar el acomodo. La app nunca muestra datos inventados.

### Celular (≈ 375 px)

```
┌─────────────────────────────────────┐
│ Buenas noches, Nombre       [!] [≡] │
│                                     │
│ ┌·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·┐ │
│ ·  Patrimonio neto                · │
│ ·  $1,234,567.89                  · │
│ ·  +$12,345.67  +1.01% este mes   · │
│ └·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·┘ │
│                                     │
│ Noviembre                           │
│ Ingresos     Gastos      Balance    │
│ $00,000.00   $00,000.00  $00,000.00 │
│ ██████████████░░░░░░  66% gastado   │
│                                     │
│ Portafolio S&P 500                  │
│ $000,000.00              +0.00% hoy │
│                                     │
│ S&P 500 +0.0% · Nasdaq +0.0% · BTC ›│
│                                     │
│ Señales                             │
│ · Alerta de precio: VOO             │
│ · Evento económico de hoy           │
│                                     │
│ Próximo pago                        │
│ Tarjeta · vence 12/11 · $0,000.00   │
│                                     │
│ Información educativa. No es        │
│ asesoría financiera.                │
├─────────────────────────────────────┤
│Mando Finan. [ + ] Merc. Inver. Trad.│
└─────────────────────────────────────┘
```

- El recuadro punteado es la retícula técnica (el elemento memorable). Dentro va el patrimonio neto en serif grande y la variación del mes en jade o carmesí.
- La barra muestra cuánto del ingreso del mes ya se gastó.
- La cinta de mercados se desliza de lado.
- `[!]` abre Señales y `[≡]` los ajustes. En la barra inferior, `[ + ]` es el botón de latón para registrar; en la app las etiquetas van completas.

### Escritorio (≈ 1280 px)

```
┌──────────────┬───────────────────────────────────────────────────────────────────────────┐
│ Bóveda       │ Buenas noches, Nombre                         jueves 05/11/2026  [!]  [≡] │
│              │ ┌·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·┐ │
│ › Mando      │ ·  Patrimonio neto                                                      · │
│   Finanzas   │ ·  $1,234,567.89                         +$12,345.67  +1.01% este mes   · │
│   Mercados   │ ·                                                                       · │
│   Inversión  │ └·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·─·┘ │
│   Trading    │ ┌──────────────────────┐ ┌──────────────────────┐ ┌─────────────────────┐ │
│ ──────────── │ │ Noviembre            │ │ Portafolio S&P 500   │ │ Próximo pago        │ │
│   Señales    │ │ Ingresos  $00,000.00 │ │ $000,000.00          │ │ Tarjeta · 12/11     │ │
│   La Bóveda  │ │ Gastos    $00,000.00 │ │ +0.00% hoy           │ │ $0,000.00           │ │
│              │ │ Balance   $00,000.00 │ │ _/\_/\/ (mini)       │ │                     │ │
│ [+ Registrar]│ └──────────────────────┘ └──────────────────────┘ └─────────────────────┘ │
│              │ ┌───────────────────────────────────────────────────────────────────────┐ │
│              │ │ S&P 500 +0.0% · Nasdaq +0.0% · IPC +0.0% · BTC +0.0% · USD/MXN 00.00  │ │
│              │ └───────────────────────────────────────────────────────────────────────┘ │
│              │ ┌──────────────────────────────────┐ ┌──────────────────────────────────┐ │
│              │ │ Señales recientes                │ │ Noticias                         │ │
│              │ │ · …                              │ │ · …                              │ │
│              │ └──────────────────────────────────┘ └──────────────────────────────────┘ │
│              │ Información educativa. No es asesoría financiera.                         │
└──────────────┴───────────────────────────────────────────────────────────────────────────┘
```

- Barra lateral fija; el contenido es una cuadrícula tipo sala de control.
- La mini gráfica del portafolio usa la línea de acero azulado.

## 8. Estados vacíos y errores

Dicen qué hacer, no se disculpan. Ejemplos:

- Sin movimientos: "Registra tu primer gasto con el botón +."
- API de mercado caída: "Mostrando el último dato guardado (hace 25 min). Se actualizará solo."
- Sin conexión: "Sin conexión. Tus registros se guardan y se suben al volver."
