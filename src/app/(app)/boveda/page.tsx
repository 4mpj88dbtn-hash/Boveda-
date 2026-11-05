import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/layout/section-placeholder";

export const metadata: Metadata = { title: "La Bóveda" };

export default function VaultPage() {
  return (
    <SectionPlaceholder
      title="La Bóveda"
      description="Tu ahorro y tus metas."
      phase={6}
      features={[
        "Metas de ahorro con fecha objetivo y aportación mensual necesaria",
        "Fondo de emergencia de 3 a 6 meses de tus gastos esenciales",
      ]}
    />
  );
}
