"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type ProfileFormState = { error?: string; saved?: boolean; displayName?: string };

const displayNameSchema = z
  .string()
  .trim()
  .max(40, { message: "Usa 40 caracteres o menos." });

/** Guarda el nombre que aparece en el saludo del Centro de mando. */
export async function updateDisplayName(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const user = await requireUser();
  const parsed = displayNameSchema.safeParse(String(formData.get("displayName") ?? ""));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, displayName: String(formData.get("displayName") ?? "") };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data === "" ? null : parsed.data })
    .eq("id", user.id);
  if (error) return { error: "No se pudo guardar el nombre. Intenta de nuevo.", displayName: parsed.data };

  refresh();
  return { saved: true, displayName: parsed.data };
}
