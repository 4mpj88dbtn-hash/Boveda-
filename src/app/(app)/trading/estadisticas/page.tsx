import type { Metadata } from "next";
import { StatsView } from "@/modules/trading/stats-view";
import { TradingHeader } from "@/modules/trading/trading-ui";

export const metadata: Metadata = { title: "Estadísticas de trading" };

export default function TradingStatsPage() {
  return (
    <>
      <TradingHeader />
      <StatsView />
    </>
  );
}
