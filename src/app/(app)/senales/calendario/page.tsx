import type { Metadata } from "next";
import { CalendarView } from "@/modules/signals/calendar-view";
import { SignalsHeader } from "@/modules/signals/signals-header";

export const metadata: Metadata = { title: "Calendario económico" };

export default function CalendarPage() {
  return (
    <>
      <SignalsHeader />
      <CalendarView />
    </>
  );
}
