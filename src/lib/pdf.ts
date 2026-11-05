/**
 * PDF de texto sencillo, hecho en el dispositivo y sin dependencias: títulos, filas
 * "concepto … monto", párrafos y líneas. Usa Helvetica (viene en todo lector de PDF) con la
 * codificación WinAnsi, que incluye acentos, ñ, ¿ y ¡.
 */

export type PdfRow =
  | { kind: "title"; text: string }
  | { kind: "subtitle"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "row"; label: string; value: string; strong?: boolean }
  | { kind: "text"; text: string }
  | { kind: "rule" }
  | { kind: "space" };

// Anchos de Helvetica y Helvetica-Bold (milésimas de punto), caracteres 32 a 126.
const REGULAR_WIDTHS =
  "278 278 355 556 556 889 667 191 333 333 389 584 278 333 278 278 556 556 556 556 556 556 556 556 556 556 278 278 584 584 584 556 1015 667 667 722 722 667 611 778 722 278 500 667 556 833 722 778 667 778 722 667 611 722 667 944 667 667 611 278 278 278 469 556 333 556 556 500 556 556 278 556 556 222 222 500 222 833 556 556 556 556 333 500 278 556 500 722 500 500 500 334 260 334 584";
const BOLD_WIDTHS =
  "278 333 474 556 556 889 722 238 333 333 389 584 278 333 278 278 556 556 556 556 556 556 556 556 556 556 333 333 584 584 584 611 975 722 722 722 722 667 611 778 722 278 556 722 611 833 722 778 667 778 722 667 611 722 667 944 667 667 611 333 278 333 584 556 333 556 611 556 611 556 333 611 611 278 278 556 278 889 611 611 611 611 389 556 333 611 556 778 556 556 500 389 280 389 584";

const parseWidths = (text: string) => text.split(" ").map(Number);
const WIDTHS = { regular: parseWidths(REGULAR_WIDTHS), bold: parseWidths(BOLD_WIDTHS) };

// Letras con acento: se miden como su letra base.
const BASE_LETTER: Record<string, string> = {
  á: "a", é: "e", í: "i", ó: "o", ú: "u", ü: "u", ñ: "n",
  Á: "A", É: "E", Í: "I", Ó: "O", Ú: "U", Ü: "U", Ñ: "N",
  "¿": "?", "¡": "!", "·": ".", "\u00a0": " ", "\u202f": " ",
};

// Caracteres fuera de Latin-1 que sí existen en WinAnsi, o que se cambian por uno parecido.
const SPECIAL_CODES: Record<string, number> = {
  "€": 0x80, "…": 0x85, "•": 0x95, "–": 0x96, "—": 0x97, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94,
  "−": 0x2d, "≈": 0x7e, "→": 0x3e, "\u00a0": 0x20, "\u202f": 0x20,
};

/** Código WinAnsi de cada carácter; lo que no existe se vuelve "?". */
export function winAnsiCodes(text: string): number[] {
  return [...text].map((char) => {
    const special = SPECIAL_CODES[char];
    if (special !== undefined) return special;
    const code = char.codePointAt(0) ?? 63;
    if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff)) return code;
    return 63;
  });
}

export function textWidth(text: string, size: number, font: "regular" | "bold"): number {
  let units = 0;
  for (const char of text) {
    const base = BASE_LETTER[char] ?? char;
    const code = base.codePointAt(0) ?? 63;
    units += code >= 32 && code <= 126 ? (WIDTHS[font][code - 32] ?? 556) : 556;
  }
  return (units * size) / 1000;
}

/** Texto para un string literal de PDF: escapa \ ( ) y escribe en octal lo que no es ASCII. */
function pdfString(text: string): string {
  return winAnsiCodes(text)
    .map((code) => {
      if (code === 0x5c || code === 0x28 || code === 0x29) return `\\${String.fromCharCode(code)}`;
      if (code < 0x20 || code > 0x7e) return `\\${code.toString(8).padStart(3, "0")}`;
      return String.fromCharCode(code);
    })
    .join("");
}

function wrap(text: string, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && textWidth(candidate, size, "regular") > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

const PAGE = { width: 595.28, height: 841.89, margin: 56 };
const INK = "0.08 0.09 0.11";
const MUTED = "0.38 0.41 0.45";
const BRASS = "0.72 0.58 0.35";

type Op = string;

function textOp(text: string, x: number, y: number, size: number, font: "regular" | "bold", color: string): Op {
  const name = font === "bold" ? "F2" : "F1";
  return `BT ${color} rg /${name} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${pdfString(text)}) Tj ET`;
}

function lineOp(y: number, color: string, width: number): Op {
  return `${color} RG ${width} w ${PAGE.margin} ${y.toFixed(2)} m ${(PAGE.width - PAGE.margin).toFixed(2)} ${y.toFixed(2)} l S`;
}

/** Acomoda las filas en páginas A4 y devuelve los bytes del PDF. */
export function buildPdf(rows: PdfRow[], footer: string): Uint8Array {
  const contentWidth = PAGE.width - PAGE.margin * 2;
  const right = PAGE.width - PAGE.margin;
  const bottom = PAGE.margin + 24;
  const pages: Op[][] = [[]];
  let y = PAGE.height - PAGE.margin;

  const page = () => pages[pages.length - 1] as Op[];
  const need = (height: number) => {
    if (y - height < bottom) {
      pages.push([]);
      y = PAGE.height - PAGE.margin;
    }
  };

  for (const row of rows) {
    switch (row.kind) {
      case "title":
        need(30);
        y -= 22;
        page().push(textOp(row.text, PAGE.margin, y, 20, "bold", INK));
        y -= 10;
        page().push(lineOp(y, BRASS, 1.2));
        y -= 8;
        break;
      case "subtitle":
        need(18);
        y -= 14;
        page().push(textOp(row.text, PAGE.margin, y, 10.5, "regular", MUTED));
        break;
      case "heading":
        need(34);
        y -= 26;
        page().push(textOp(row.text, PAGE.margin, y, 13, "bold", INK));
        y -= 4;
        break;
      case "row": {
        need(18);
        y -= 17;
        const font = row.strong ? "bold" : "regular";
        page().push(textOp(row.label, PAGE.margin, y, 11, font, row.strong ? INK : MUTED));
        page().push(textOp(row.value, right - textWidth(row.value, 11, font), y, 11, font, INK));
        break;
      }
      case "text":
        for (const line of wrap(row.text, 10, contentWidth)) {
          need(14);
          y -= 14;
          page().push(textOp(line, PAGE.margin, y, 10, "regular", MUTED));
        }
        break;
      case "rule":
        need(10);
        y -= 8;
        page().push(lineOp(y, "0.85 0.85 0.85", 0.5));
        break;
      case "space":
        y -= 10;
        break;
    }
  }

  pages.forEach((ops, index) => {
    const label = `${footer} · ${index + 1}/${pages.length}`;
    ops.push(textOp(label, PAGE.margin, PAGE.margin - 8, 8, "regular", MUTED));
  });

  // Objetos: 1 catálogo, 2 páginas, 3 y 4 fuentes; luego página y contenido por cada hoja.
  const objects: string[] = [];
  const pageIds = pages.map((_, index) => 5 + index * 2);
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
  pages.forEach((ops, index) => {
    const pageId = 5 + index * 2;
    const stream = ops.join("\n");
    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE.width} ${PAGE.height}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageId + 1} 0 R >>`;
    objects[pageId + 1] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });

  // Todo es ASCII, así que la posición en el texto es la posición en bytes.
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = pdf.length;
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id += 1) pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}
