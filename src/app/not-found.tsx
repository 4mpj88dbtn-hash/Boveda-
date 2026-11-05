import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-[max(16px,env(safe-area-inset-left))] py-12">
      <p className="font-serif text-titulo font-semibold text-laton">Bóveda</p>
      <div className="flex flex-col gap-2">
        <h1 className="text-display">Esta página no existe</h1>
        <p className="text-interfaz text-texto-2">Revisa la dirección o vuelve al Centro de mando.</p>
      </div>
      <Link href="/" className={buttonVariants({ size: "lg" })}>
        Ir al Centro de mando
      </Link>
    </main>
  );
}
