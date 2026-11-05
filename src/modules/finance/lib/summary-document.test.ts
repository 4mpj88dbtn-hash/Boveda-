import { describe, expect, it } from "vitest";
import { monthRange, weekRange } from "@/lib/dates";
import { DEFAULT_CATEGORIES } from "../defaults";
import { summarizePeriod } from "./period-summary";
import { summaryFooter, summaryHeading, summaryRows, summaryText } from "./summary-document";
import { movement } from "./test-data";

const transactions = [
  movement({ type: "ingreso", amountCents: 1_000_000, categoryId: "ingreso-honorarios", date: "2026-11-02" }),
  movement({ type: "gasto", amountCents: 30_000, categoryId: "gasto-comida", date: "2026-11-02" }),
  movement({ type: "gasto", amountCents: 70_000, categoryId: "gasto-super", date: "2026-11-05" }),
];
const names = new Map(DEFAULT_CATEGORIES.map((category) => [category.id, category.name]));
const categoryName = (id: string) => names.get(id) ?? "?";

describe("summaryHeading", () => {
  it("nombra la semana de lunes a domingo y el mes con mayúscula", () => {
    expect(summaryHeading("semanal", weekRange("2026-11-05"))).toEqual({
      title: "Resumen semanal",
      subtitle: "Del lunes 02/11/2026 al domingo 08/11/2026",
    });
    expect(summaryHeading("mensual", monthRange("2026-11-05")).subtitle).toBe("Noviembre de 2026");
  });
});

describe("summaryRows y summaryText", () => {
  const summary = summarizePeriod("semanal", weekRange("2026-11-05"), transactions, DEFAULT_CATEGORIES, "2026-11-09");
  const input = { summary, categoryName, generatedAt: new Date("2026-11-09T02:40:00Z") };

  it("incluye totales, top de categorías y el día de mayor gasto", () => {
    const rows = summaryRows(input);
    expect(rows).toContainEqual({ kind: "row", label: "Balance", value: "+$9,000.00", strong: true });
    expect(rows).toContainEqual({ kind: "row", label: "Súper (70%)", value: "$700.00" });
    expect(rows).toContainEqual({ kind: "row", label: "Día de mayor gasto: jueves 05/11/2026", value: "$700.00" });
  });

  it("arma un texto corto para compartir", () => {
    const text = summaryText(input);
    expect(text.split("\n")[0]).toBe("Resumen semanal · Del lunes 02/11/2026 al domingo 08/11/2026");
    expect(text).toContain("Tasa de ahorro: 90.0%");
    expect(text).toContain("En qué se fue: Súper $700.00, Comida $300.00");
  });

  it("el pie lleva la hora de Cancún", () => {
    // 02:40 UTC del 9 de noviembre = 21:40 del domingo 8 en Cancún.
    expect(summaryFooter(new Date("2026-11-09T02:40:00Z"))).toBe(
      "Bóveda · generado el 08/11/2026 a las 21:40 (hora de Cancún)",
    );
  });
});
