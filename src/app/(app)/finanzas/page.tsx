import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/layout/section-placeholder";

export const metadata: Metadata = { title: "Finanzas" };

export default function FinancesPage() {
  return (
    <SectionPlaceholder
      title="Finanzas"
      description="Tus ingresos, gastos, cuentas y presupuestos, en pesos y dólares."
      phase={1}
      features={[
        "Registro rápido: monto, categoría y guardar, en 3 toques",
        "Cuentas, tarjetas y patrimonio neto con su gráfica mensual",
        "Historial con búsqueda, edición y filtros por fecha, categoría y cuenta",
        "Resúmenes semanal (domingo 20:00) y mensual (día 1, 9:00)",
        "Presupuestos por categoría con avisos al 80% y al 100%",
        "Registro sin conexión que se sube solo al volver el internet",
      ]}
    />
  );
}
