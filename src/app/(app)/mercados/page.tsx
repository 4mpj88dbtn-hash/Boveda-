import type { Metadata } from "next";
import { MarketsView } from "@/modules/markets/markets-view";

export const metadata: Metadata = { title: "Mercados" };

export default function MarketsPage() {
  return <MarketsView />;
}
