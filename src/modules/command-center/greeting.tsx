import { connection } from "next/server";
import { formatDateWithWeekday, greetingFor } from "@/lib/dates";
import { getProfile } from "@/modules/profile/queries";

/** Saludo según la hora de Cancún, con el nombre que elegiste en Ajustes. */
export async function Greeting() {
  const profile = await getProfile();
  await connection();
  const now = new Date();
  const greeting = greetingFor(now);

  return (
    <header className="flex flex-col gap-1 lg:flex-row lg:items-baseline lg:justify-between">
      <h1 className="text-display lg:text-display-lg">
        {profile.displayName ? `${greeting}, ${profile.displayName}` : greeting}
      </h1>
      <p className="cifras text-etiqueta text-texto-2">{formatDateWithWeekday(now)}</p>
    </header>
  );
}

export function GreetingFallback() {
  return (
    <header className="flex flex-col gap-1">
      <h1 className="text-display text-texto-2 lg:text-display-lg">Centro de mando</h1>
    </header>
  );
}
