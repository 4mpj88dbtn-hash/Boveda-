// Después de compilar: escribe en out/sw.js la lista de archivos que el service worker guarda
// al instalarse, y una versión que cambia con cada compilación (así el celular se actualiza).
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const OUT = "out";
const BASE_PATH = "/Boveda-";
const SKIP = new Set(["sw.js", ".nojekyll"]);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const files = walk(OUT)
  .map((path) => relative(OUT, path).split(sep).join("/"))
  .filter((path) => !SKIP.has(path) && !path.endsWith(".map"))
  .sort();

const hash = createHash("sha256");
for (const file of files) hash.update(file).update(readFileSync(join(OUT, file)));
const version = `${Date.now().toString(36)}-${hash.digest("hex").slice(0, 12)}`;

// "finanzas/index.html" se pide como "/Boveda-/finanzas/".
const urls = files.map((file) => {
  if (file === "index.html") return `${BASE_PATH}/`;
  if (file.endsWith("/index.html")) return `${BASE_PATH}/${file.slice(0, -"index.html".length)}`;
  return `${BASE_PATH}/${file}`;
});

const swPath = join(OUT, "sw.js");
const source = readFileSync(swPath, "utf8");
const marker = /\/\*__PRECACHE__\*\/ \{ version: "desarrollo", files: \[\] \}/;
if (!marker.test(source)) throw new Error("No se encontró la marca __PRECACHE__ en out/sw.js");
writeFileSync(swPath, source.replace(marker, JSON.stringify({ version, files: urls })));

console.log(`Service worker listo: ${urls.length} archivos, versión ${version}`);
