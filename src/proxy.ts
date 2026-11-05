import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Todo menos archivos estáticos, íconos, fuentes, el manifiesto y el service worker.
  matcher: [
    "/((?!_next/static|_next/image|sw\\.js|manifest\\.webmanifest|robots\\.txt|icon|apple-icon|icons/|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2)$).*)",
  ],
};
