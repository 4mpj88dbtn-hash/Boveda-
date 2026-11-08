import { describe, expect, it } from "vitest";
import { leerMetricas } from "../../../../scripts/inversion/fundamentales.mjs";
import { assess, assessCompany, median, type Company } from "./fundamentals";

describe("leerMetricas", () => {
  it("toma el primer nombre disponible de cada indicador", () => {
    const result = leerMetricas({ peTTM: 30.123456, pbAnnual: 40, "totalDebt/totalEquityQuarterly": 1.5 });
    expect(result).toMatchObject({ pe: 30.1235, pb: 40, debtEquity: 1.5, roe: null });
  });
});

describe("median", () => {
  it("mediana con número par e impar de datos", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});

describe("assess", () => {
  it("reglas fijas: liquidez menor a 1, reparto mayor a 100% y pérdidas", () => {
    expect(assess("currentRatio", 0.8, 1.2).light).toBe("rojo");
    expect(assess("payout", 120, 40).light).toBe("rojo");
    expect(assess("netMargin", -5, 10).light).toBe("rojo");
  });

  it("contra la mediana de sus pares con ±10%", () => {
    // P/E 20 contra mediana 30: 33% más barato → verde. P/E 31 → parecido → amarillo.
    expect(assess("pe", 20, 30).light).toBe("verde");
    expect(assess("pe", 31, 30).light).toBe("amarillo");
    expect(assess("netMargin", 10, 20).light).toBe("rojo");
    expect(assess("roe", null, 20).light).toBe("gris");
  });
});

describe("assessCompany", () => {
  const company = (simbolo: string, sector: string, pe: number): Company => ({ simbolo, nombre: simbolo, sector, metricas: { pe } });

  it("usa el sector si tiene al menos 3 empresas; si no, toda la lista", () => {
    const all = [company("A", "Tech", 20), company("B", "Tech", 30), company("C", "Tech", 40), company("D", "Banca", 10)];
    const tech = assessCompany(all[0] as Company, all);
    expect(tech.peers).toBe("su sector (Tech)");
    expect(tech.items.find((item) => item.key === "pe")).toMatchObject({ peerMedian: 35, light: "verde" });
    const bank = assessCompany(all[3] as Company, all);
    expect(bank.peers).toBe("las demás empresas de la lista");
  });
});
