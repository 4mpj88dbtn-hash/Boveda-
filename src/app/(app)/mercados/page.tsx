import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/layout/section-placeholder";

export const metadata: Metadata = { title: "Mercados" };

export default function MarketsPage() {
  return (
    <SectionPlaceholder
      title="Mercados"
      description="Los activos que sigues, con la fuente y la hora de cada dato."
      phase={2}
      educational
      features={[
        "S&P 500, Nasdaq, Dow Jones, IPC, Bitcoin, Ethereum, dólar vs peso, oro, petróleo, VIX y tasas",
        "Gráficas de línea y velas de 1 día a todo el historial",
        "Comparador base 100 para ver qué rindió más",
        "Estado del mercado (abierto, cerrado, pre-apertura) en hora de Cancún",
      ]}
    />
  );
}
