import type { Metadata } from "next";
import { InvestingHeader } from "@/modules/investing/investing-header";
import { CalculatorsView } from "@/modules/investing/calculators-view";

export const metadata: Metadata = { title: "Calculadoras" };

export default function CalculatorsPage() {
  return (
    <>
      <InvestingHeader />
      <CalculatorsView />
    </>
  );
}
