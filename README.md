# Bóveda

App personal de finanzas, inversión y mercados, instalable en celular y computadora. Funciona **sin servidor**: tus datos viven solo en tu dispositivo y la app se publica gratis en GitHub Pages.

> Información educativa. No es asesoría financiera.

## 👉 Abrir la app: https://4mpj88dbtn-hash.github.io/Boveda-/

Para tenerla siempre a la mano, instálala: en iPhone, Safari → Compartir → **Agregar a inicio**; en Android, Chrome → ⋮ → **Instalar app**.

**Estado:** Fase 1 (Finanzas) completa: registro rápido, cuentas, historial, resúmenes con PDF, presupuestos, recurrentes, plantillas y foto del ticket. Las demás secciones muestran qué llega en cada fase. El avance está en [`ROADMAP.md`](ROADMAP.md).

## Activar la publicación (una sola vez)

Lo haces tú en GitHub, porque son ajustes de tu cuenta:

1. **Hacer público el repositorio:** en GitHub abre `Boveda-` → **Settings** → baja hasta **Danger Zone** → **Change repository visibility** → **Make public** y confirma. Se ve el código; nunca tus datos, que viven en tu dispositivo.
2. **Activar GitHub Pages:** **Settings** → **Pages** → en **Build and deployment**, **Source: Deploy from a branch** → rama **`gh-pages`**, carpeta **`/ (root)`** → **Save**.
3. Espera uno o dos minutos y abre la dirección de arriba.

Desde ese momento, cada avance que se suba a GitHub se revisa y se publica solo en esa dirección.

## Usar la app

1. Abre la dirección en tu celular.
2. Escribe cómo quieres que te salude y crea un PIN de 6 dígitos que solo tú sepas.
3. Instálala:
   - **iPhone:** Safari → Compartir → **Agregar a inicio**.
   - **Android:** Chrome → menú ⋮ → **Instalar app**.
4. Desde ahí ábrela con su ícono. Funciona sin internet.

### Registrar un gasto o un ingreso

1. Toca el botón **+**.
2. Escribe el monto con el teclado de la pantalla y toca la categoría.
3. Toca **Guardar gasto**. Si te equivocaste, toca **Deshacer** en el aviso de abajo.

- Arriba eliges **Gasto**, **Ingreso** o **Transferencia** (mover dinero entre tus cuentas, por ejemplo pagar la tarjeta).
- **Repetir último** llena todo igual que tu último movimiento.
- Para pagos en dólares toca **USD** y escribe el tipo de cambio del día: cuántos pesos vale 1 dólar. La app lo recuerda para la próxima vez.
- **Más detalles** agrega nota, método de pago y etiquetas.
- En **Finanzas** ves el historial del mes, buscas, filtras y tocas un movimiento para corregirlo o eliminarlo. En **Cuentas** agregas tus bancos y tarjetas con su saldo de hoy.

### Respaldos

Tus datos existen solo en ese dispositivo. Si lo pierdes o se borran los datos del navegador, solo los recuperas con un respaldo.

- **Ajustes → Descargar respaldo.** Incluye tus cuentas, categorías y movimientos. En el celular se abre el menú de compartir: guárdalo en Archivos, iCloud o Drive. Hazlo cada semana.
- **Ajustes → Restaurar respaldo** reemplaza los datos actuales por los del archivo. El respaldo nunca incluye tu PIN.
- Para usar la app en otro dispositivo: descarga un respaldo en uno y restáuralo en el otro.

### Si algo sale mal

- **Olvidé mi PIN.** No se puede recuperar porque solo existe en tu dispositivo. En la pantalla del PIN toca **¿Olvidaste tu PIN?**, borra todo, crea un PIN nuevo y restaura tu último respaldo.
- **Me equivoqué de PIN varias veces.** Después de 5 intentos la app te hace esperar 30 segundos, y el doble cada vez, hasta 15 minutos.
- **La dirección muestra un error 404.** Revisa que GitHub Pages esté activo con la rama `gh-pages` (paso 2 de arriba).

## Qué claves necesita

Los precios de mercado funcionan sin claves (Yahoo Finance y Coinbase). Tres datos necesitan una clave **gratuita**; se guardan en GitHub, nunca en el código (el repositorio es público):

1. En GitHub abre `Boveda-` → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
2. **`BANXICO_TOKEN`** (FIX y tasa objetivo de Banxico): pide el token en https://www.banxico.org.mx/SieAPIRest/service/v1/token.
3. **`FRED_API_KEY`** (tasa de la Fed): crea una cuenta en https://fred.stlouisfed.org y pide una API key en tu perfil.

La siguiente actualización (máximo 20 minutos en horario de mercado) ya los incluye.

### Datos de mercado

- Una tarea de GitHub Actions (`.github/workflows/mercados.yml`) baja los precios cada 20 minutos en horario de mercado de EE. UU. y cada 3 horas fuera de él, y los publica en `datos/` junto a la app. Tus datos personales nunca salen del dispositivo.
- La actualización programada solo corre desde la rama `main` (así funciona GitHub). Mientras trabajamos en una rama, los precios se actualizan cada vez que se publica un cambio.
- Yahoo Finance no tiene una API oficial: puede cambiar o limitar consultas. Si falla, la app muestra el último dato con su hora y se puede cambiar a otra fuente.

## Correrla en tu computadora

Necesitas [Node.js 22](https://nodejs.org).

```bash
npm install          # instala las dependencias (una vez)
npm run dev          # modo desarrollo: http://localhost:3000/Boveda-/
```

Para probar la versión compilada, igual que en GitHub Pages:

```bash
npm run build        # compila a la carpeta out/
npm start            # la sirve en http://localhost:3000/Boveda-/
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | App en modo desarrollo |
| `npm run build` / `npm start` | Compila y sirve la versión publicada |
| `npm run check` | Estilo, tipos y pruebas unitarias |
| `npm test` | Pruebas unitarias (dinero, fechas, PIN, bloqueo, respaldos, saldos, totales y base de datos) |
| `npm run test:e2e` | Flujo completo en un navegador: bienvenida, PIN, registrar, editar, cuentas, respaldo y modo sin internet |

## Cómo está organizado

```
src/app/            pantallas (las direcciones van en español: /finanzas/, /mercados/…)
src/modules/        lógica por área: bloqueo con PIN, ajustes, Centro de mando, finanzas
src/components/     componentes de interfaz y navegación
src/lib/            dinero, fechas, base de datos local, PIN, respaldos
public/sw.js        service worker (instalación y modo sin internet)
scripts/            preparación del service worker y servidor local
tests/e2e/          pruebas de flujo completo
docs/               requisitos, arquitectura y diseño
```

## Créditos

- Gráficas: TradingView Lightweight Charts™ — Copyright (c) 2025 TradingView, Inc. — https://www.tradingview.com/ (licencia Apache 2.0).

## Seguridad

- La app se abre con un PIN; mientras está bloqueada no muestra ningún dato.
- El PIN nunca se guarda: solo una huella PBKDF2-SHA256 de 600,000 vueltas con sal aleatoria.
- Tus datos no salen de tu dispositivo, salvo en el respaldo que tú descargas.
- La página solo carga y se conecta a sus propios archivos (política de seguridad de contenido).
- El repositorio es público: no contiene claves, datos ni respaldos.
