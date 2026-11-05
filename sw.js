/*
 * Service worker de Bóveda.
 * - Al instalarse guarda todas las pantallas y archivos de la app, para que abra sin internet.
 * - Con internet pide las pantallas frescas (máximo 3 segundos); sin internet usa las guardadas.
 * - Los archivos de /_next/static nunca cambian de contenido: se sirven desde lo guardado.
 * - Tus datos no pasan por aquí: viven en la base del navegador (IndexedDB).
 * La lista de archivos y la versión las escribe `scripts/precache.mjs` al compilar.
 */
const PRECACHE = {"version":"mw43ux7v-8b843e292d83","files":["/Boveda-/404.html","/Boveda-/404/","/Boveda-/__next.!KGFwcCk.__PAGE__.txt","/Boveda-/__next._full.txt","/Boveda-/__next._tree.txt","/Boveda-/_next/static/bIZ-O-HaA7QCOVJRY7fcH/_buildManifest.js","/Boveda-/_next/static/bIZ-O-HaA7QCOVJRY7fcH/_clientMiddlewareManifest.js","/Boveda-/_next/static/bIZ-O-HaA7QCOVJRY7fcH/_ssgManifest.js","/Boveda-/_next/static/chunks/0cz1d0mv5g_q7.js","/Boveda-/_next/static/chunks/0lew9razgs9aj.js","/Boveda-/_next/static/chunks/0lk5w72-0ama7.js","/Boveda-/_next/static/chunks/0o9oz3yxxxecb.js","/Boveda-/_next/static/chunks/0w-_023yk4tbj.js","/Boveda-/_next/static/chunks/1wnov70f88xjy.js","/Boveda-/_next/static/chunks/23e6jep2anmtk.js","/Boveda-/_next/static/chunks/2d_8gi_fut8lp.js","/Boveda-/_next/static/chunks/2oxdpjx9px5zr.js","/Boveda-/_next/static/chunks/2sfc0_hgp655_.js","/Boveda-/_next/static/chunks/2ul6jsebsnhg-.js","/Boveda-/_next/static/chunks/310vm2bl3xxpt.js","/Boveda-/_next/static/chunks/3aa6srpn5qhya.js","/Boveda-/_next/static/chunks/3q9rpe8tx0wej.js","/Boveda-/_next/static/chunks/3qfy96eoyh-ek.js","/Boveda-/_next/static/chunks/3tas86uo6-8nr.css","/Boveda-/_next/static/chunks/3vnqbwhvovsu-.js","/Boveda-/_next/static/chunks/3zt_16xndew4w.js","/Boveda-/_next/static/chunks/405qu5du3fqxn.js","/Boveda-/_next/static/chunks/42efbarqm0d3b.js","/Boveda-/_next/static/chunks/435so86d49tdx.js","/Boveda-/_next/static/chunks/turbopack-3f86ren5mi0tm.js","/Boveda-/_next/static/media/apple-icon.0vpskizptoif1.png","/Boveda-/_next/static/media/cormorant_garamond_latin_500_normal-s.p.1ua6lqq3rsqyo.woff2","/Boveda-/_next/static/media/cormorant_garamond_latin_600_normal-s.p.2k7r9iymu8ux8.woff2","/Boveda-/_next/static/media/ibm_plex_sans_latin_wght_normal-s.p.15jby9eboz7vb.woff2","/Boveda-/_next/static/media/icon.3fpu1516bclfk.svg","/Boveda-/_not-found/__next._full.txt","/Boveda-/_not-found/__next._not-found.__PAGE__.txt","/Boveda-/_not-found/__next._tree.txt","/Boveda-/_not-found/","/Boveda-/_not-found/index.txt","/Boveda-/ajustes/__next.!KGFwcCk.ajustes.__PAGE__.txt","/Boveda-/ajustes/__next._full.txt","/Boveda-/ajustes/__next._tree.txt","/Boveda-/ajustes/","/Boveda-/ajustes/index.txt","/Boveda-/apple-icon.png","/Boveda-/boveda/__next.!KGFwcCk.boveda.__PAGE__.txt","/Boveda-/boveda/__next._full.txt","/Boveda-/boveda/__next._tree.txt","/Boveda-/boveda/","/Boveda-/boveda/index.txt","/Boveda-/finanzas/__next.!KGFwcCk.finanzas.__PAGE__.txt","/Boveda-/finanzas/__next._full.txt","/Boveda-/finanzas/__next._tree.txt","/Boveda-/finanzas/categorias/__next.!KGFwcCk.finanzas.categorias.__PAGE__.txt","/Boveda-/finanzas/categorias/__next._full.txt","/Boveda-/finanzas/categorias/__next._tree.txt","/Boveda-/finanzas/categorias/","/Boveda-/finanzas/categorias/index.txt","/Boveda-/finanzas/cuentas/__next.!KGFwcCk.finanzas.cuentas.__PAGE__.txt","/Boveda-/finanzas/cuentas/__next._full.txt","/Boveda-/finanzas/cuentas/__next._tree.txt","/Boveda-/finanzas/cuentas/","/Boveda-/finanzas/cuentas/index.txt","/Boveda-/finanzas/","/Boveda-/finanzas/index.txt","/Boveda-/icon.svg","/Boveda-/icons/icon-192.png","/Boveda-/icons/icon-512.png","/Boveda-/icons/icon-maskable-512.png","/Boveda-/","/Boveda-/index.txt","/Boveda-/inversion/__next.!KGFwcCk.inversion.__PAGE__.txt","/Boveda-/inversion/__next._full.txt","/Boveda-/inversion/__next._tree.txt","/Boveda-/inversion/","/Boveda-/inversion/index.txt","/Boveda-/manifest.webmanifest","/Boveda-/mercados/__next.!KGFwcCk.mercados.__PAGE__.txt","/Boveda-/mercados/__next._full.txt","/Boveda-/mercados/__next._tree.txt","/Boveda-/mercados/","/Boveda-/mercados/index.txt","/Boveda-/robots.txt","/Boveda-/senales/__next.!KGFwcCk.senales.__PAGE__.txt","/Boveda-/senales/__next._full.txt","/Boveda-/senales/__next._tree.txt","/Boveda-/senales/","/Boveda-/senales/index.txt","/Boveda-/sin-conexion/__next._full.txt","/Boveda-/sin-conexion/__next._tree.txt","/Boveda-/sin-conexion/__next.sin-conexion.__PAGE__.txt","/Boveda-/sin-conexion/","/Boveda-/sin-conexion/index.txt","/Boveda-/trading/__next.!KGFwcCk.trading.__PAGE__.txt","/Boveda-/trading/__next._full.txt","/Boveda-/trading/__next._tree.txt","/Boveda-/trading/","/Boveda-/trading/index.txt"]};
const CACHE_PREFIX = "boveda-";
const CACHE_NAME = CACHE_PREFIX + PRECACHE.version;
const SCOPE = new URL(self.registration.scope).pathname;
const OFFLINE_URL = SCOPE + "sin-conexion/";
const NETWORK_TIMEOUT_MS = 3000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE.files))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  // Conserva la versión anterior por si una pantalla abierta todavía la necesita.
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        const ours = keys.filter((key) => key.startsWith(CACHE_PREFIX)).sort().reverse();
        const keep = new Set([CACHE_NAME, ours.find((key) => key !== CACHE_NAME)]);
        return Promise.all(ours.filter((key) => !keep.has(key)).map((key) => caches.delete(key)));
      })
      .then(() => self.clients.claim()),
  );
});

function fromNetwork(request) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("tiempo agotado")), NETWORK_TIMEOUT_MS);
    fetch(request).then(
      (response) => {
        clearTimeout(timer);
        resolve(response);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function networkFirst(request, fallbackUrl) {
  try {
    const response = await fromNetwork(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    if (fallbackUrl) {
      const fallback = await caches.match(fallbackUrl);
      if (fallback) return fallback;
    }
    return Response.error();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, OFFLINE_URL));
  } else if (url.pathname.startsWith(SCOPE + "_next/static/") || url.pathname.startsWith(SCOPE + "icons/")) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(networkFirst(request));
  }
});
