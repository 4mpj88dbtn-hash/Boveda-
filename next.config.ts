import type { NextConfig } from "next";

// La app se publica en GitHub Pages: https://4mpj88dbtn-hash.github.io/Boveda-/
export const BASE_PATH = "/Boveda-";

const nextConfig: NextConfig = {
  // Sin servidor: la compilación genera archivos estáticos en `out/`.
  output: "export",
  basePath: BASE_PATH,
  trailingSlash: true,
  images: { unoptimized: true },
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_BASE_PATH: BASE_PATH,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
