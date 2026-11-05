import type { Account, Category, CategoryType } from "./types";

/**
 * Categorías y cuenta con las que empieza la app. Se pueden renombrar, cambiar de ícono o
 * archivar. Los identificadores son fijos para que un respaldo se restaure igual en otro
 * dispositivo.
 */

type DefaultCategory = Pick<Category, "id" | "name" | "icon" | "group">;

const EXPENSES: DefaultCategory[] = [
  { id: "gasto-comida", name: "Comida", icon: "utensils", group: "necesidades" },
  { id: "gasto-super", name: "Súper", icon: "shopping-cart", group: "necesidades" },
  { id: "gasto-restaurantes", name: "Restaurantes", icon: "utensils-crossed", group: "deseos" },
  { id: "gasto-transporte", name: "Transporte", icon: "fuel", group: "necesidades" },
  { id: "gasto-casa", name: "Casa y renta", icon: "house", group: "necesidades" },
  { id: "gasto-servicios", name: "Servicios", icon: "lightbulb", group: "necesidades" },
  { id: "gasto-salud", name: "Salud", icon: "heart-pulse", group: "necesidades" },
  { id: "gasto-educacion", name: "Educación", icon: "graduation-cap", group: "necesidades" },
  { id: "gasto-entretenimiento", name: "Entretenimiento", icon: "clapperboard", group: "deseos" },
  { id: "gasto-ropa", name: "Ropa", icon: "shirt", group: "deseos" },
  { id: "gasto-suscripciones", name: "Suscripciones", icon: "repeat", group: "deseos" },
  { id: "gasto-deudas", name: "Pago de deudas", icon: "landmark", group: "ahorro" },
  { id: "gasto-regalos", name: "Regalos", icon: "gift", group: "deseos" },
  { id: "gasto-otros", name: "Otros gastos", icon: "ellipsis", group: null },
];

const INCOME: DefaultCategory[] = [
  { id: "ingreso-honorarios", name: "Honorarios", icon: "briefcase", group: null },
  { id: "ingreso-salario", name: "Salario", icon: "wallet", group: null },
  { id: "ingreso-negocio", name: "Negocio", icon: "store", group: null },
  { id: "ingreso-inversiones", name: "Inversiones", icon: "trending-up", group: null },
  { id: "ingreso-ventas", name: "Ventas", icon: "tag", group: null },
  { id: "ingreso-otros", name: "Otros ingresos", icon: "ellipsis", group: null },
];

function toCategories(type: CategoryType, list: DefaultCategory[]): Category[] {
  return list.map((category, index) => ({
    ...category,
    type,
    parentId: null,
    archived: false,
    order: index,
  }));
}

export const DEFAULT_CATEGORIES: Category[] = [...toCategories("gasto", EXPENSES), ...toCategories("ingreso", INCOME)];

export const DEFAULT_ACCOUNT_ID = "cuenta-efectivo";

export function defaultAccounts(now: number): Account[] {
  return [
    {
      id: DEFAULT_ACCOUNT_ID,
      name: "Efectivo",
      kind: "efectivo",
      currency: "MXN",
      openingBalanceCents: 0,
      archived: false,
      order: 0,
      createdAt: now,
    },
  ];
}
