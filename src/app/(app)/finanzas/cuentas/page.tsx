import type { Metadata } from "next";
import { AccountsView } from "@/modules/finance/accounts-view";
import { FinanceHeader } from "@/modules/finance/finance-tabs";

export const metadata: Metadata = { title: "Cuentas" };

export default function AccountsPage() {
  return (
    <>
      <FinanceHeader />
      <AccountsView />
    </>
  );
}
