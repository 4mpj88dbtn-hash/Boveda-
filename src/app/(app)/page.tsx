import type { Metadata } from "next";
import { EducationalNotice, EmptyState, PhaseTag } from "@/components/ui/notices";
import { Panel } from "@/components/ui/panel";
import { Greeting } from "@/modules/command-center/greeting";
import { MonthPanel, NetWorthHeader } from "@/modules/finance/overview";
import { TodayPanel } from "@/modules/finance/today-panel";
import { PortfolioPanel } from "@/modules/investing/portfolio-panel";
import { MarketsTicker } from "@/modules/markets/markets-ticker";
import { NewsPanel, SignalsPanel } from "@/modules/signals/home-panels";

export const metadata: Metadata = { title: "Centro de mando" };

export default function CommandCenterPage() {
  return (
    <>
      <Greeting />

      <NetWorthHeader />

      <TodayPanel />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        <MonthPanel />

        <PortfolioPanel />

        <Panel title="Próximo pago" action={<PhaseTag phase={6} />} className="md:col-span-2 lg:col-span-1">
          <EmptyState
            title="Sin pagos programados"
            description="Tus fechas de corte, pagos de tarjeta y suscripciones aparecerán aquí."
          />
        </Panel>
      </div>

      <MarketsTicker />

      <div className="grid gap-4 md:grid-cols-2 lg:gap-6">
        <SignalsPanel />
        <NewsPanel />
      </div>

      <EducationalNotice />
    </>
  );
}
