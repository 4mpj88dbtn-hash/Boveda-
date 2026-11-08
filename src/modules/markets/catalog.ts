import catalogo from "./catalogo.json";

/** Activos que publica la tarea de GitHub Actions (mismo archivo que usa el script). */

export type AssetKind = "indice" | "etf" | "accion" | "cripto" | "divisa" | "materia" | "tasa";
export type AssetUnit = "pts" | "USD" | "MXN" | "%";

export type Asset = {
  id: string;
  nombre: string;
  grupo: string;
  tipo: AssetKind;
  unidad: AssetUnit;
  yahoo?: string;
  coinbase?: string;
  banxico?: string;
  fred?: string;
  /** Solo se guarda su historia (por ejemplo, el S&P 500 con dividendos). */
  soloHistoria?: boolean;
};

export const FIXED_ASSETS = catalogo.fijos as Asset[];
export const EXTRA_ASSETS = catalogo.extra as Asset[];
export const ALL_ASSETS = [...FIXED_ASSETS, ...EXTRA_ASSETS];

const byId = new Map(ALL_ASSETS.map((asset) => [asset.id, asset]));

export function assetById(id: string): Asset | undefined {
  return byId.get(id);
}

/** Activos que se pueden agregar a "Mi watchlist". */
export const WATCHLIST_OPTIONS = EXTRA_ASSETS.filter((asset) => !asset.soloHistoria);

/** Los que necesitan una clave gratuita guardada en los secretos del repositorio. */
export function requiredKey(asset: Asset): "BANXICO_TOKEN" | "FRED_API_KEY" | null {
  if (asset.yahoo || asset.coinbase) return null;
  if (asset.banxico) return "BANXICO_TOKEN";
  if (asset.fred) return "FRED_API_KEY";
  return null;
}
