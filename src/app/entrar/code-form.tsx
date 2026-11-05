"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/field";
import type { AuthFormState } from "@/lib/auth/actions";

type CodeFormProps = {
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  submitLabel: string;
  pendingLabel: string;
  /** Campos ocultos extra, por ejemplo el identificador del factor 2FA. */
  hiddenFields?: Record<string, string>;
};

/** Formulario del código de 6 dígitos de la app autenticadora. */
export function CodeForm({ action, submitLabel, pendingLabel, hiddenFields = {} }: CodeFormProps) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Field id="code" label="Código de 6 dígitos">
        <Input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={7}
          placeholder="123456"
          className="cifras text-center text-titulo tracking-[0.3em]"
          aria-invalid={state.error ? true : undefined}
          required
        />
      </Field>
      {state.error ? <FormMessage>{state.error}</FormMessage> : null}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}
