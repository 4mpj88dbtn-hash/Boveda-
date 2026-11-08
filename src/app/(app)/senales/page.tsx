import type { Metadata } from "next";
import { AlertsView } from "@/modules/signals/alerts-view";
import { SignalsHeader } from "@/modules/signals/signals-header";

export const metadata: Metadata = { title: "Señales" };

export default function SignalsPage() {
  return (
    <>
      <SignalsHeader />
      <AlertsView />
    </>
  );
}
