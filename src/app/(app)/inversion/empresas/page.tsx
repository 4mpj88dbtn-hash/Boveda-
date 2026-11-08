import type { Metadata } from "next";
import { InvestingHeader } from "@/modules/investing/investing-header";
import { CompaniesView } from "@/modules/investing/companies-view";

export const metadata: Metadata = { title: "Empresas" };

export default function CompaniesPage() {
  return (
    <>
      <InvestingHeader />
      <CompaniesView />
    </>
  );
}
