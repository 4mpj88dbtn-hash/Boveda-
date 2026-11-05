/*
 * Service worker de Bóveda.
 * - Al instalarse guarda todas las pantallas y archivos de la app, para que abra sin internet.
 * - Con internet pide las pantallas frescas (máximo 3 segundos); sin internet usa las guardadas.
 * - Los archivos de /_next/static nunca cambian de contenido: se sirven desde lo guardado.
 * - Tus datos no pasan por aquí: viven en la base del navegador (IndexedDB).
 * La lista de archivos y la versión las escribe `scripts/precache.mjs` al compilar.
 */
const PRECACHE = /*__PRECACHE__*/ { version: "desarrollo", files: [] };
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
