"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/field";
import { updateDisplayName, type ProfileFormState } from "@/modules/profile/actions";

const initialState: ProfileFormState = {};

export function DisplayNameForm({ defaultValue }: { defaultValue: string }) {
  const [state, action, pending] = useActionState(updateDisplayName, initialState);

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Field
        id="displayName"
        label="Tu nombre para el saludo"
        hint="Aparece en el Centro de mando, por ejemplo: “Buenas noches, Ana”. Déjalo vacío si no quieres nombre."
      >
        <Input
          id="displayName"
          name="displayName"
          defaultValue={state.displayName ?? defaultValue}
          maxLength={40}
          autoComplete="given-name"
          aria-describedby="displayName-ayuda"
        />
      </Field>
      {state.error ? <FormMessage>{state.error}</FormMessage> : null}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar nombre"}
        </Button>
        <p role="status" className="text-etiqueta text-positivo">
          {state.saved && !pending ? "Nombre guardado." : ""}
        </p>
      </div>
    </form>
  );
}
