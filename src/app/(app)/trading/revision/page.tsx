import type { Metadata } from "next";
import { ReviewView } from "@/modules/trading/review-view";
import { TradingHeader } from "@/modules/trading/trading-ui";

export const metadata: Metadata = { title: "Revisión semanal" };

export default function TradingReviewPage() {
  return (
    <>
      <TradingHeader />
      <ReviewView />
    </>
  );
}
