"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MIN_PASSWORD, safeNext } from "@/lib/auth";

// firstTime: Adresse steht auf der Team-Liste, hat aber noch kein Konto → Karte wechselt zu „Passwort festlegen“.
export type LoginState = { error?: string; email?: string; firstTime?: boolean };

// Ist die Datenbank nicht erreichbar (z. B. pausiert, Vorfall 22.–26.10.), soll niemand glauben, das Passwort sei falsch.
const OFFLINE = "HQ ist gerade nicht erreichbar. An deinem Passwort liegt es nicht. Schreib Maxi S.";
const NOT_ON_LIST = "Diese Mail steht nicht auf der Team-Liste. Vertippt?";

// Ein Formular, zwei Wege: Anmelden (mode „login“) und beim ersten Mal das Passwort festlegen (mode „setup“).
export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const setup = form.get("mode") === "setup";
  const next = safeNext(String(form.get("next") ?? ""));

  if (!email || !password) return { error: "Bitte Mail und Passwort eingeben.", email, firstTime: setup };

  const supabase = await createClient();

  // Erstes Mal: neues Passwort + Bestätigung → Konto anlegen
  if (setup) {
    if (password !== String(form.get("confirm") ?? "")) {
      return { error: "Die beiden Passwörter sind nicht gleich.", email, firstTime: true };
    }
    if (password.length < MIN_PASSWORD) {
      return { error: `Das Passwort braucht mindestens ${MIN_PASSWORD} Zeichen.`, email, firstTime: true };
    }
    const person = await findPerson(email);
    if (person === "offline") return { error: OFFLINE, email, firstTime: true };
    if (!person) return { error: NOT_ON_LIST, email, firstTime: true };
    if (person.user_id) return { error: "Für diese Mail gibt es schon ein Passwort. Melde dich normal an.", email };

    const { error } = await createAdminClient().auth.admin.createUser({ email, password, email_confirm: true });
    if (error && offline(error.status)) return { error: OFFLINE, email, firstTime: true };
    if (error) return { error: "Das hat nicht geklappt. Versuch es noch einmal.", email, firstTime: true };

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) return { error: "Passwort gespeichert. Melde dich jetzt an.", email };
    redirect(next);
  }

  // Normaler Weg
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (!error) redirect(next);
  if (error.status === 429) return { error: "Zu viele Versuche. Warte ein paar Minuten.", email };
  if (offline(error.status)) return { error: OFFLINE, email };

  // Kein Treffer: Woran liegt es?
  const person = await findPerson(email);
  if (person === "offline") return { error: OFFLINE, email };
  if (!person) return { error: NOT_ON_LIST, email };
  if (!person.user_id) return { email, firstTime: true };
  return { error: "Passwort stimmt nicht.", email };
}

// Status 0 = keine Verbindung (Supabase nicht erreichbar), ab 500 = Fehler bei Supabase.
function offline(status: number | undefined) {
  return !status || status >= 500;
}

async function findPerson(email: string) {
  // Ohne Wiederholungen: Sonst wartet man bei einem Ausfall gut 7 s auf die Meldung.
  const { data, error } = await createAdminClient()
    .from("people")
    .select("id, user_id")
    .eq("email", email)
    .retry(false)
    .maybeSingle();
  return error ? ("offline" as const) : data;
}
