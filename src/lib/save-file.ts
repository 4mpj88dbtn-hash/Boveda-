"use client";

/**
 * Entrega un archivo al usuario. En el celular abre el menú de compartir (para guardarlo en
 * Archivos, iCloud o Drive); en la computadora lo descarga.
 */
export async function saveFile(file: File): Promise<"compartido" | "descargado" | "cancelado"> {
  const isTouch = window.matchMedia("(pointer: coarse)").matches;
  if (isTouch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name });
      return "compartido";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelado";
      // Si compartir falla, se intenta descargar.
    }
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "descargado";
}
