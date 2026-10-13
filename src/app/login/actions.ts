"use server";

import { timingSafeEqual } from "node:crypto";
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

function codeMatches(input: string) {
  const expected = process.env.TEAM_INVITE_CODE ?? "";
  if (!expected) return false;
  const a = Buffer.from(input.toLowerCase());
  const b = Buffer.from(expected.toLowerCase());
  return a.length === b.length && timingSafeEqual(a, b);
}

// Erstes Mal: Konto für eine Adresse aus der Allowlist anlegen. Nur mit Team-Code,
// damit niemand Fremdes das Konto einer Team-Person vorher beansprucht.
export async function setupAccount(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = field(form, "email").toLowerCase();
  const password = String(form.get("password") ?? "");
  const code = field(form, "code");

  if (!email || !password || !code) return { error: "Bitte alle drei Felder ausfüllen.", email };
  if (password.length < MIN_PASSWORD) {
    return { error: `Das Passwort braucht mindestens ${MIN_PASSWORD} Zeichen.`, email };
  }
  if (!codeMatches(code)) {
    await new Promise((r) => setTimeout(r, 800)); // Raten bremsen
    return { error: "Der Team-Code stimmt nicht. Du findest ihn in der WhatsApp-Gruppe.", email };
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
