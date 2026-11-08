import type { Metadata } from "next";
import { TradingCalculatorsView } from "@/modules/trading/calculators-view";
import { TradingHeader } from "@/modules/trading/trading-ui";

export const metadata: Metadata = { title: "Calculadoras de trading" };

export default function TradingCalculatorsPage() {
  return (
    <>
      <TradingHeader />
      <TradingCalculatorsView />
    </>
  );
}
