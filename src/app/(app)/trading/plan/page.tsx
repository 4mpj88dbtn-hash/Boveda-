import type { Metadata } from "next";
import { PlanView } from "@/modules/trading/plan-view";
import { TradingHeader } from "@/modules/trading/trading-ui";

export const metadata: Metadata = { title: "Plan de trading" };

export default function TradingPlanPage() {
  return (
    <>
      <TradingHeader />
      <PlanView />
    </>
  );
}
