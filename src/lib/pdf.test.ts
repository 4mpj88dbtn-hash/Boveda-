import { describe, expect, it } from "vitest";
import { buildPdf, textWidth, winAnsiCodes } from "./pdf";

const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

describe("buildPdf", () => {
  const rows = [
    { kind: "title" as const, text: "Resumen semanal" },
    { kind: "row" as const, label: "Gastos", value: "$1,200.00" },
    { kind: "text" as const, text: "Información educativa. ¿Dudas? Revisa tu año." },
  ];

  it("arma un PDF válido: cada objeto está donde dice la tabla xref", () => {
    const pdf = decode(buildPdf(rows, "Bóveda"));
    expect(pdf.startsWith("%PDF-1.4\n")).toBe(true);
    expect(pdf.trimEnd().endsWith("%%EOF")).toBe(true);

    const startxref = Number(/startxref\n(\d+)/.exec(pdf)?.[1]);
    expect(pdf.slice(startxref, startxref + 4)).toBe("xref");
    const entries = [...pdf.slice(startxref).matchAll(/^(\d{10}) 00000 n $/gm)].map((match) => Number(match[1]));
    expect(entries).toHaveLength(6); // catálogo, páginas, 2 fuentes, página y contenido
    entries.forEach((offset, index) => expect(pdf.slice(offset).startsWith(`${index + 1} 0 obj`)).toBe(true));
  });

  it("declara el largo exacto de cada contenido", () => {
    const pdf = decode(buildPdf(rows, "Bóveda"));
    for (const match of pdf.matchAll(/<< \/Length (\d+) >>\nstream\n/g)) {
      const start = (match.index ?? 0) + match[0].length;
      expect(pdf.slice(start + Number(match[1]), start + Number(match[1]) + 10)).toBe("\nendstream");
    }
  });

  it("escribe acentos en WinAnsi (octal) y escapa paréntesis", () => {
    const pdf = decode(buildPdf([{ kind: "text", text: "Año (ñ) ¿sí?" }], "x"));
    expect(pdf).toContain("(A\\361o \\(\\361\\) \\277s\\355?) Tj");
  });

  it("pasa a una página nueva cuando no cabe", () => {
    const many = Array.from({ length: 80 }, (_, index) => ({ kind: "row" as const, label: `Fila ${index}`, value: "$1.00" }));
    const pdf = decode(buildPdf(many, "x"));
    expect(pdf).toMatch(/\/Count 2 >>/);
    expect(pdf).toContain("(x \\267 2/2) Tj"); // "·" va en octal
  });
});

describe("winAnsiCodes y textWidth", () => {
  it("convierte caracteres especiales a su equivalente", () => {
    expect(winAnsiCodes("€ − ≈ 😀")).toEqual([0x80, 0x20, 0x2d, 0x20, 0x7e, 0x20, 63]);
  });

  it("mide con los anchos de Helvetica: los dígitos miden igual", () => {
    // "$1,200.00" = $ 556 + 1 556 + , 278 + 2 556 + 0 556 + 0 556 + . 278 + 0 556 + 0 556 = 4,448 → 48.928 pt a 11 pt.
    expect(textWidth("$1,200.00", 11, "regular")).toBeCloseTo(48.928, 6);
    expect(textWidth("ñ", 10, "regular")).toBeCloseTo(textWidth("n", 10, "regular"), 6);
  });
});
