import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/layout/section-placeholder";

export const metadata: Metadata = { title: "Inversión" };

export default function InvestingPage() {
  return (
    <SectionPlaceholder
      title="Inversión"
      description="Tu plan principal: invertir cada mes en el S&P 500 y entender cómo crece."
      phase={4}
      educational
      features={[
        "Tu portafolio: lo que has aportado, lo que vale hoy y cuánto viene del mercado y del tipo de cambio",
        "Calculadoras con su fórmula: interés compuesto, escenarios, CAGR, XIRR y más",
        "Guía para principiantes: qué es un ETF, cómo invertir desde México y riesgo cambiario",
        "Análisis fundamental de empresas con semáforo",
      ]}
    />
  );
}
