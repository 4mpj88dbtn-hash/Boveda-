/**
 * Script que corre mientras el navegador lee la página, antes de pintarla.
 * En el cliente se marca como texto para que React no intente ejecutarlo otra vez.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
