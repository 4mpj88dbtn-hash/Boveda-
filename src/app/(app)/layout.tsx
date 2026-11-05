import { BottomNav } from "@/components/layout/bottom-nav";
import { MobileTopBar } from "@/components/layout/mobile-top-bar";
import { Sidebar } from "@/components/layout/sidebar";

/**
 * Marco de la app con sesión: barra lateral en escritorio, barra inferior en el celular.
 * El marco es estático y carga al instante; los datos de cada pantalla llegan después.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <Sidebar />
      <div className="min-w-0">
        <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-[max(16px,env(safe-area-inset-left))] pb-[calc(96px+env(safe-area-inset-bottom))] pt-[max(12px,env(safe-area-inset-top))] lg:px-8 lg:pb-12 lg:pt-8">
          <MobileTopBar />
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
