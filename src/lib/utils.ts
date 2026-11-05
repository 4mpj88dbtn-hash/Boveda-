import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Le dice a tailwind-merge cuáles son nuestros tamaños de texto, radios y sombras,
// para que no los confunda con colores al combinar clases.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "hero",
            "hero-lg",
            "display",
            "display-lg",
            "titulo",
            "titulo-lg",
            "cifra",
            "cifra-lg",
            "cuerpo",
            "interfaz",
            "etiqueta",
            "nota",
          ],
        },
      ],
      rounded: [{ rounded: ["control", "tarjeta", "hoja"] }],
      shadow: [{ shadow: ["flotante"] }],
    },
  },
});

/** Combina clases de Tailwind sin duplicados ni conflictos. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
