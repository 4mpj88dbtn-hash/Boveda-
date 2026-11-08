import type { Metadata } from "next";
import { FinanceHeader } from "@/modules/finance/finance-tabs";
import { BudgetsView } from "@/modules/finance/budgets-view";

export const metadata: Metadata = { title: "Presupuestos" };

export default function BudgetsPage() {
  return (
    <>
      <FinanceHeader />
      <BudgetsView />
    </>
  );
}
