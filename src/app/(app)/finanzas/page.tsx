import type { Metadata } from "next";
import { FinanceHeader } from "@/modules/finance/finance-tabs";
import { MovementsView } from "@/modules/finance/movements-view";

export const metadata: Metadata = { title: "Finanzas" };

export default function FinancesPage() {
  return (
    <>
      <FinanceHeader />
      <MovementsView />
    </>
  );
}
