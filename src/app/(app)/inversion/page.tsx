import type { Metadata } from "next";
import { InvestingHeader } from "@/modules/investing/investing-header";
import { PortfolioView } from "@/modules/investing/portfolio-view";

export const metadata: Metadata = { title: "Inversión" };

export default function InvestingPage() {
  return (
    <>
      <InvestingHeader />
      <PortfolioView />
    </>
  );
}
