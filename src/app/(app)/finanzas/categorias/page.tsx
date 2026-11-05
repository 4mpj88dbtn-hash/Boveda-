import type { Metadata } from "next";
import { CategoriesView } from "@/modules/finance/categories-view";
import { FinanceHeader } from "@/modules/finance/finance-tabs";

export const metadata: Metadata = { title: "Categorías" };

export default function CategoriesPage() {
  return (
    <>
      <FinanceHeader />
      <CategoriesView />
    </>
  );
}
