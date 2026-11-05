/** Ruta donde vive la app en GitHub Pages ("/Boveda-"). Los enlaces de Next ya la agregan solos. */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Antepone la ruta base a una dirección propia, para lo que no pasa por <Link>. */
export function withBasePath(path: string): string {
  return `${BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
}
