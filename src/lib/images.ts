"use client";

/** Foto lista para guardar: JPEG de máximo 1280 px por lado (unos 150 KB). */
export type CompressedImage = { data: ArrayBuffer; mimeType: "image/jpeg"; width: number; height: number };

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Algunos navegadores no leen ciertos formatos así; se intenta con una imagen normal.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Reduce y comprime la foto en el dispositivo antes de guardarla. */
export async function compressImage(file: Blob, maxSide = 1280, quality = 0.72): Promise<CompressedImage> {
  const source = await decode(file);
  const scale = Math.min(1, maxSide / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No se pudo procesar la foto.");
  context.drawImage(source, 0, 0, width, height);
  if ("close" in source) source.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((result) => (result ? resolve(result) : reject(new Error("No se pudo procesar la foto."))), "image/jpeg", quality),
  );
  return { data: await blob.arrayBuffer(), mimeType: "image/jpeg", width, height };
}
