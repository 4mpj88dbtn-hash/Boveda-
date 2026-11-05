import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/layout/section-placeholder";

export const metadata: Metadata = { title: "Trading" };

export default function TradingPage() {
  return (
    <SectionPlaceholder
      title="Trading"
      description="Aprender con método y con capital ficticio antes de arriesgar dinero real."
      phase={5}
      educational
      features={[
        "Simulador con capital ficticio y precios reales",
        "Diario de cada operación: plan, emoción y lección aprendida",
        "Estadísticas: aciertos, riesgo/beneficio, esperanza y drawdown",
        "Calculadoras de tamaño de posición y límites de pérdida",
      ]}
    />
  );
}
