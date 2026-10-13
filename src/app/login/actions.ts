"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeNext } from "@/lib/auth";

export type LoginState = { error?: string; email?: string };

const MIN_PASSWORD = 10;

function field(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim();
}

// Anmelden mit Mail und Passwort
export async function signIn(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = field(form, "email").toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Bitte Mail und Passwort eingeben.", email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const tooMany = error.status === 429;
    return {
      error: tooMany
        ? "Zu viele Versuche. Warte ein paar Minuten."
        : "Mail oder Passwort stimmt nicht.",
      email,
    };
  }
  redirect(safeNext(field(form, "next")));
}

// Erstes Mal: Konto für eine Adresse aus der Allowlist anlegen (eigenes Passwort, ohne Mail-Bestätigung).
export async function setupAccount(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = field(form, "email").toLowerCase();
  const password = String(form.get("password") ?? "");

  if (!email || !password) return { error: "Bitte Mail und Passwort eingeben.", email };
  if (password.length < MIN_PASSWORD) {
    return { error: `Das Passwort braucht mindestens ${MIN_PASSWORD} Zeichen.`, email };
  }

  const admin = createAdminClient();
  const { data: person, error: lookupError } = await admin
    .from("people")
    .select("id, user_id")
    .eq("email", email)
    .maybeSingle();
  if (lookupError) return { error: "Das hat nicht geklappt. Versuch es noch einmal.", email };
  if (!person) return { error: "Diese Adresse steht nicht auf der Team-Liste.", email };
  if (person.user_id) {
    return { error: "Für diese Adresse gibt es schon ein Konto. Melde dich einfach an.", email };
  }

  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError) {
    const exists = /already|registered|exists/i.test(createError.message);
    return {
      error: exists
        ? "Für diese Adresse gibt es schon ein Konto. Melde dich einfach an."
        : "Das Konto konnte nicht angelegt werden. Versuch es noch einmal.",
      email,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Konto angelegt. Melde dich jetzt an.", email };
  redirect(safeNext(field(form, "next")));
}
