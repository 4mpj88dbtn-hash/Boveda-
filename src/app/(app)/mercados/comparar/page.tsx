import type { Metadata } from "next";
import { CompareView } from "@/modules/markets/compare-view";

export const metadata: Metadata = { title: "Comparador base 100" };

export default function ComparePage() {
  return <CompareView />;
}
