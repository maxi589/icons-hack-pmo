"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeNext } from "@/lib/auth";

// firstTime: Adresse steht auf der Team-Liste, hat aber noch kein Konto → Passwort wiederholen lassen.
export type LoginState = { error?: string; email?: string; firstTime?: boolean };

const MIN_PASSWORD = 10;

// Ein Formular für alles: Anmelden, und beim ersten Mal das Passwort festlegen.
export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const confirm = form.get("confirm");
  const next = safeNext(String(form.get("next") ?? ""));

  if (!email || !password) return { error: "Bitte Mail und Passwort eingeben.", email };

  const supabase = await createClient();

  // Zweiter Schritt beim ersten Mal: Passwort bestätigt → Konto anlegen
  if (confirm !== null) {
    if (password !== String(confirm)) {
      return { error: "Die beiden Passwörter sind nicht gleich.", email, firstTime: true };
    }
    if (password.length < MIN_PASSWORD) {
      return { error: `Das Passwort braucht mindestens ${MIN_PASSWORD} Zeichen.`, email, firstTime: true };
    }
    const person = await findPerson(email);
    if (!person) return { error: "Mail oder Passwort stimmt nicht.", email };
    if (person.user_id) return { error: "Für diese Adresse gibt es schon ein Passwort. Melde dich normal an.", email };

    const { error } = await createAdminClient().auth.admin.createUser({ email, password, email_confirm: true });
    if (error) return { error: "Das hat nicht geklappt. Versuch es noch einmal.", email, firstTime: true };

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) return { error: "Passwort gespeichert. Melde dich jetzt an.", email };
    redirect(next);
  }

  // Normaler Weg
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (!error) redirect(next);
  if (error.status === 429) return { error: "Zu viele Versuche. Warte ein paar Minuten.", email };

  // Kein Treffer: Ist es jemand vom Team, der noch kein Passwort hat?
  const person = await findPerson(email);
  if (person && !person.user_id) return { email, firstTime: true };
  return { error: "Mail oder Passwort stimmt nicht.", email };
}

async function findPerson(email: string) {
  const { data } = await createAdminClient()
    .from("people")
    .select("id, user_id")
    .eq("email", email)
    .maybeSingle();
  return data;
}
