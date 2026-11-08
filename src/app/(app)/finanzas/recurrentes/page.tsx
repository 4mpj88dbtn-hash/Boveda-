import type { Metadata } from "next";
import { FinanceHeader } from "@/modules/finance/finance-tabs";
import { RecurringView } from "@/modules/finance/recurring-view";

export const metadata: Metadata = { title: "Recurrentes y plantillas" };

export default function RecurringPage() {
  return (
    <>
      <FinanceHeader />
      <RecurringView />
    </>
  );
}
