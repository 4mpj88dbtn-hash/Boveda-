// Sirve la carpeta out/ como lo hace GitHub Pages (en /Boveda-/), para probar la app compilada.
// Uso: npm run build && npm start   →   http://localhost:3000/Boveda-/
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const OUT = "out";
const BASE_PATH = "/Boveda-";
const PORT = Number(process.env.PORT ?? 3000);
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  if (url.pathname === "/" || url.pathname === BASE_PATH) {
    response.writeHead(302, { Location: `${BASE_PATH}/` });
    response.end();
    return;
  }
  if (!url.pathname.startsWith(`${BASE_PATH}/`)) {
    response.writeHead(404).end();
    return;
  }
  const relativePath = normalize(decodeURIComponent(url.pathname.slice(BASE_PATH.length))).replace(/^(\.\.[/\\])+/, "");
  let file = join(OUT, relativePath);
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) {
    response.writeHead(404, { "Content-Type": TYPES[".html"] });
    createReadStream(join(OUT, "404.html")).pipe(response);
    return;
  }
  response.writeHead(200, {
    "Content-Type": TYPES[extname(file)] ?? "application/octet-stream",
    "Cache-Control": file.endsWith("sw.js") ? "no-cache" : "public, max-age=0",
  });
  createReadStream(file).pipe(response);
}).listen(PORT, () => {
  console.log(`Bóveda en http://localhost:${PORT}${BASE_PATH}/`);
});
