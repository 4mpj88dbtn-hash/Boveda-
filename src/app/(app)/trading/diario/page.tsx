import type { Metadata } from "next";
import { JournalView } from "@/modules/trading/journal-view";
import { TradingHeader } from "@/modules/trading/trading-ui";

export const metadata: Metadata = { title: "Diario de trading" };

export default function JournalPage() {
  return (
    <>
      <TradingHeader />
      <JournalView />
    </>
  );
}
