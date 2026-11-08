import type { Metadata } from "next";
import { SimulatorView } from "@/modules/trading/simulator-view";
import { TradingHeader } from "@/modules/trading/trading-ui";

export const metadata: Metadata = { title: "Trading" };

export default function TradingPage() {
  return (
    <>
      <TradingHeader />
      <SimulatorView />
    </>
  );
}
