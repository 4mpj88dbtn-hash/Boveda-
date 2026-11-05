export default function AuthLayout({ children }: LayoutProps<"/entrar">) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-[max(16px,env(safe-area-inset-left))] py-12">
      <p className="font-serif text-titulo font-semibold text-laton">Bóveda</p>
      {children}
    </main>
  );
}
