import type { Metadata } from "next";
import { InvestingHeader } from "@/modules/investing/investing-header";
import { SimulatorView } from "@/modules/investing/simulator-view";

export const metadata: Metadata = { title: "Simulador histórico" };

export default function SimulatorPage() {
  return (
    <>
      <InvestingHeader />
      <SimulatorView />
    </>
  );
}
