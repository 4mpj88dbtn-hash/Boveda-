import type { Metadata } from "next";
import { LessonsView } from "@/modules/trading/lessons-view";
import { TradingHeader } from "@/modules/trading/trading-ui";

export const metadata: Metadata = { title: "Lecciones de trading" };

export default function TradingLessonsPage() {
  return (
    <>
      <TradingHeader />
      <LessonsView />
    </>
  );
}
