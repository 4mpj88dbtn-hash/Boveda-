import type { Metadata } from "next";
import { FinanceHeader } from "@/modules/finance/finance-tabs";
import { SummariesView } from "@/modules/finance/summaries-view";

export const metadata: Metadata = { title: "Resúmenes" };

export default function SummariesPage() {
  return (
    <>
      <FinanceHeader />
      <SummariesView />
    </>
  );
}
