"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/field";
import { signIn, type AuthFormState } from "@/lib/auth/actions";

const initialState: AuthFormState = {};

export function SignInForm() {
  const [state, action, pending] = useActionState(signIn, initialState);

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Field id="email" label="Correo">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          defaultValue={state.email}
          required
        />
      </Field>
      <Field id="password" label="Contraseña">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      {state.error ? <FormMessage>{state.error}</FormMessage> : null}
      <Button type="submit" size="lg" disabled={pending} className="mt-2">
        {pending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
