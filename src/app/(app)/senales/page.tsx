import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/layout/section-placeholder";

export const metadata: Metadata = { title: "Señales" };

export default function SignalsPage() {
  return (
    <SectionPlaceholder
      title="Señales"
      description="Tus alertas, en la app y en tu Telegram."
      phase={3}
      features={[
        "Pre-apertura y cierre del mercado cada día hábil",
        "Alertas de precio y de movimientos fuertes",
        "Noticias de alto impacto: Fed, Banxico e inflación",
        "Horario de silencio y máximo de alertas por hora",
      ]}
    />
  );
}
