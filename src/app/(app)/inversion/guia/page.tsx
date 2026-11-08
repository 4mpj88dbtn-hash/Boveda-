import type { Metadata } from "next";
import { InvestingHeader } from "@/modules/investing/investing-header";
import { GuideView } from "@/modules/investing/guide-view";

export const metadata: Metadata = { title: "Guía para invertir" };

export default function GuidePage() {
  return (
    <>
      <InvestingHeader />
      <GuideView />
    </>
  );
}
