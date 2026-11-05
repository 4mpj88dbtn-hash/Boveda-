"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/** Muestra la clave del 2FA en bloques de 4 y permite copiarla para escribirla a mano. */
export function CopySecret({ secret }: { secret: string }) {
  const [status, setStatus] = useState<"" | "copiada" | "selecciona">("");
  const textRef = useRef<HTMLElement>(null);
  const grouped = secret.match(/.{1,4}/g)?.join(" ") ?? secret;

  async function copy() {
    try {
      await navigator.clipboard.writeText(secret);
      setStatus("copiada");
    } catch {
      const node = textRef.current;
      if (node) {
        const range = document.createRange();
        range.selectNodeContents(node);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
      }
      setStatus("selecciona");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-etiqueta text-texto-2">O escribe esta clave a mano en tu app:</p>
      <div className="flex flex-wrap items-center gap-3">
        <code ref={textRef} className="cifras break-all font-mono text-interfaz text-texto">
          {grouped}
        </code>
        <Button variant="secundario" onClick={copy}>
          Copiar clave
        </Button>
      </div>
      <p role="status" className="text-nota text-texto-2">
        {status === "copiada" ? "Clave copiada." : status === "selecciona" ? "Selecciona la clave y cópiala." : ""}
      </p>
    </div>
  );
}
