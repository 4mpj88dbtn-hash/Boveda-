"use client";

import { useEffect, useState } from "react";
import { formatDateWithWeekday, greetingFor } from "@/lib/dates";
import { useSetting } from "@/lib/settings";

/** Saludo según la hora de Cancún, con el nombre que elegiste. Se actualiza cada minuto. */
export function Greeting() {
  const name = useSetting("displayName")?.value;
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const greeting = greetingFor(now);

  return (
    <header className="flex flex-col gap-1 lg:flex-row lg:items-baseline lg:justify-between">
      <h1 className="text-display lg:text-display-lg">{name ? `${greeting}, ${name}` : greeting}</h1>
      <p className="cifras text-etiqueta text-texto-2">{formatDateWithWeekday(now)}</p>
    </header>
  );
}
