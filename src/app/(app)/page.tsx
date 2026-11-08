import type { Metadata } from "next";
import { EducationalNotice, EmptyState, PhaseTag } from "@/components/ui/notices";
import { Panel } from "@/components/ui/panel";
import { Greeting } from "@/modules/command-center/greeting";
import { MonthPanel, NetWorthHeader } from "@/modules/finance/overview";
import { TodayPanel } from "@/modules/finance/today-panel";

export const metadata: Metadata = { title: "Centro de mando" };

export default function CommandCenterPage() {
  return (
    <>
      <Greeting />

      <NetWorthHeader />

      <TodayPanel />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        <MonthPanel />

        <Panel title="Portafolio S&P 500" action={<PhaseTag phase={4} />}>
          <EmptyState
            title="Sin compras registradas"
            description="Aquí verás lo que has aportado, lo que vale hoy y tu rendimiento en USD y MXN."
          />
        </Panel>

        <Panel title="Próximo pago" action={<PhaseTag phase={6} />} className="md:col-span-2 lg:col-span-1">
          <EmptyState
            title="Sin pagos programados"
            description="Tus fechas de corte, pagos de tarjeta y suscripciones aparecerán aquí."
          />
        </Panel>
      </div>

      <Panel title="Mercados" action={<PhaseTag phase={2} />}>
        <EmptyState
          title="La cinta de mercados llega en la Fase 2"
          description="S&P 500, Nasdaq, IPC, Bitcoin y dólar vs peso, cada dato con su fuente y su hora de actualización."
        />
      </Panel>

      <div className="grid gap-4 md:grid-cols-2 lg:gap-6">
        <Panel title="Señales recientes" action={<PhaseTag phase={3} />}>
          <EmptyState
            title="Sin señales"
            description="Las alertas de precio, la pre-apertura y el cierre del mercado llegarán aquí y a tu Telegram."
          />
        </Panel>
        <Panel title="Noticias" action={<PhaseTag phase={3} />}>
          <EmptyState
            title="Sin noticias"
            description="Noticias de la Fed, Banxico y de tus activos, con su fuente y su hora."
          />
        </Panel>
      </div>

      <EducationalNotice />
    </>
  );
}
