"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MIN_PASSWORD } from "@/lib/auth";

// Profil: eigenes Passwort ändern und Personen ins Team einladen.
// Einladen = Eintrag in der Team-Liste (`people`). Die Person meldet sich danach mit ihrer Mail an und legt
// beim ersten Mal ihr Passwort fest (wie beim Login). Kein Mailversand. Alle im Team dürfen einladen (keine Rollen).

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function changePassword(current: string, next: string): Promise<ActionResult> {
  if (next.length < MIN_PASSWORD) return { ok: false, error: `Mindestens ${MIN_PASSWORD} Zeichen.` };

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email;
  if (!email) return { ok: false, error: "Bitte neu anmelden." };

  // Aktuelles Passwort prüfen, bevor es ersetzt wird.
  const check = await supabase.auth.signInWithPassword({ email, password: current });
  if (check.error) {
    if (check.error.status === 429) return { ok: false, error: "Zu viele Versuche. Warte ein paar Minuten." };
    return { ok: false, error: "Aktuelles Passwort stimmt nicht." };
  }

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) {
    if (error.code === "same_password") return { ok: false, error: "Das ist dein bisheriges Passwort." };
    if (error.code === "weak_password") return { ok: false, error: "Zu schwach. Nimm ein längeres Passwort." };
    return { ok: false, error: "Hat nicht geklappt. Bitte nochmal versuchen." };
  }
  return { ok: true };
}

// Avatar-Farben für neue Personen (das Kernteam hat eigene Tokens --avatar-<initialen>). Alle sehr hell,
// Initialen #111 darauf über 13:1.
const NEW_COLORS = ["#f5d0ec", "#d9f5c5", "#ffe0b8", "#d6e4ff", "#ead8ff", "#ccf2ee", "#f1e6d8"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function invitePerson(rawName: string, rawEmail: string): Promise<ActionResult> {
  const name = rawName.trim().replace(/\s+/g, " ");
  const email = rawEmail.trim().toLowerCase();
  if (!name || name.length > 40) return { ok: false, error: "Bitte einen Namen eingeben." };
  if (!EMAIL.test(email)) return { ok: false, error: "Bitte eine gültige Mail eingeben." };

  // Nur wer selbst im Team ist, darf einladen.
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { ok: false, error: "Bitte neu anmelden." };
  const admin = createAdminClient();
  const { data: team } = await admin.from("people").select("user_id, email, initials, color, sort");
  if (!team?.some((p) => p.user_id === data.user!.id)) return { ok: false, error: "Nur fürs Team." };
  if (team.some((p) => p.email === email)) return { ok: false, error: "Diese Mail ist schon im Team." };

  const taken = new Set(team.map((p) => p.initials.toUpperCase()));
  const used = new Set(team.map((p) => p.color.toLowerCase()));
  const { error } = await admin.from("people").insert({
    name,
    initials: pickInitials(name, taken),
    color: NEW_COLORS.find((c) => !used.has(c)) ?? NEW_COLORS[team.length % NEW_COLORS.length],
    email,
    sort: Math.max(0, ...team.map((p) => p.sort)) + 1,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Diese Mail ist schon im Team." };
    return { ok: false, error: "Hat nicht geklappt. Bitte nochmal versuchen." };
  }
  return { ok: true };
}

/** „Lena“ → „LE“, „Anna K“ → „AK“; bei Gleichstand ein anderer Buchstabe aus dem Namen. */
function pickInitials(name: string, taken: Set<string>) {
  const words = name.toUpperCase().split(" ");
  const letters = words.join("").replace(/[^A-ZÄÖÜ]/g, "");
  const first = letters[0] ?? "X";
  const preferred = words.length > 1 ? first + (words[1].replace(/[^A-ZÄÖÜ]/g, "")[0] ?? "") : letters.slice(0, 2);
  const options = [preferred, ...letters.slice(1).split("").map((l) => first + l)];
  return options.find((o) => o.length === 2 && !taken.has(o)) ?? preferred.padEnd(2, "X");
}
