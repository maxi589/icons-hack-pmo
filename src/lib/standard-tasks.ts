import { createClient } from "@/lib/supabase/client";
import type { Organization, Role, Stage } from "./pipeline";
import { shiftDue } from "./tasks";

// Standard-Aufgaben beim Wechsel auf „Zugesagt“ (Maxi, 16.10.: „passt so“). Frist = Tage ab dem Wechsel.
// Zuständig ist die zuständige Person der Firma, sonst wer umstellt; der Bereich kommt aus dem Typ.
// Hat eine Firma zwei Typen, gilt die Liste des ersten in ROLE_ORDER. Titel ändern = nur hier.
// Direkt auf „Fix“ (= schon unterschrieben bzw. verbindlich) fällt die Vertrags-Aufgabe weg (contract).

export const STANDARD_TASKS: Record<Role, { title: string; days: number; contract?: true }[]> = {
  challenge: [
    { title: "Vereinbarung schicken", days: 3, contract: true },
    { title: "Logo + Text für Website holen", days: 7 },
    { title: "Challenge-Brief abstimmen", days: 14 },
    { title: "Rechnung stellen", days: 14 },
    { title: "Zahlung prüfen", days: 44 },
  ],
  sponsor: [
    { title: "Vereinbarung schicken", days: 3, contract: true },
    { title: "Logo + Text für Website holen", days: 7 },
    { title: "Rechnung stellen", days: 14 },
    { title: "Zahlung prüfen", days: 44 },
  ],
  tokens: [
    { title: "Vereinbarung schicken", days: 3, contract: true },
    { title: "Logo + Text für Website holen", days: 7 },
    { title: "Credits für Teilnehmende klären", days: 14 },
  ],
  jury: [
    { title: "Briefing schicken (Ablauf, Kriterien)", days: 7 },
    { title: "Foto + Kurzbio holen", days: 7 },
    { title: "Anreise + Zeitfenster klären", days: 21 },
  ],
  venue: [
    { title: "Vertrag prüfen + unterschreiben", days: 3, contract: true },
    { title: "Anzahlung klären", days: 14 },
    { title: "Ablauf vor Ort klären (Technik, Catering, Übernachtung)", days: 21 },
  ],
};

const ROLE_ORDER: Role[] = ["challenge", "sponsor", "tokens", "jury", "venue"];

/** Bereich je Typ (IDs der Tabelle `areas`). */
const ROLE_AREA: Record<Role, string> = { challenge: "partner", sponsor: "sponsoren", tokens: "sponsoren", jury: "jury", venue: "venue" };

const primaryRole = (o: Pick<Organization, "roles">) => ROLE_ORDER.find((r) => o.roles.includes(r)) ?? null;

/** Bereich einer Firma, z. B. für „+ Aufgabe“ im Firmen-Detail. */
export function orgArea(o: Pick<Organization, "roles">) {
  const r = primaryRole(o);
  return r ? ROLE_AREA[r] : null;
}

/** Nur der Schritt aus einer früheren Stufe auf „Zugesagt“ oder direkt auf „Fix“; Fix → Zugesagt und zurück nicht. */
export const getsStandardTasks = (from: Stage, to: Stage) => (to === "zugesagt" || to === "fix") && from !== "zugesagt" && from !== "fix";

/**
 * Legt die fehlenden Standard-Aufgaben an (gleicher Titel an derselben Firma = schon da, nicht doppelt).
 * Liefert die neuen Aufgaben (für „Rückgängig“) oder null, wenn das Speichern nicht geklappt hat.
 */
export async function addStandardTasks(org: Organization, to: Stage, today: string, meId: string | null) {
  const role = primaryRole(org);
  if (!role) return [];
  const supabase = createClient();
  const { data: existing, error: readError } = await supabase.from("tasks").select("title").eq("organization_id", org.id);
  if (readError) return null;
  const have = new Set((existing ?? []).map((t) => t.title));
  const rows = STANDARD_TASKS[role]
    .filter((t) => !have.has(t.title) && !(to === "fix" && t.contract))
    .map((t) => ({
      title: t.title,
      due_date: shiftDue(null, today, t.days),
      assignee_id: org.owner_id ?? meId,
      area_id: ROLE_AREA[role],
      organization_id: org.id,
      created_by: meId,
    }));
  if (!rows.length) return [];
  const { data, error } = await supabase.from("tasks").insert(rows).select("id, title");
  if (error) return null;
  return (data ?? []) as { id: string; title: string }[];
}

/**
 * Firma auf „Abgesagt“ (Maxi, 16.10.): offene Aufgaben der Firma (auch „In Arbeit“) löschen, Erledigte bleiben.
 * Liefert die gelöschten Zeilen vollständig (für „Rückgängig“ mit gleicher ID, Kommentare bleiben verknüpft) oder null.
 */
export async function removeOpenTasks(orgId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.from("tasks").select("*").eq("organization_id", orgId).neq("status", "erledigt");
  if (error) return null;
  if (!data.length) return [];
  const { error: delError } = await supabase.from("tasks").delete().in("id", data.map((t) => t.id));
  return delError ? null : (data as Record<string, unknown>[]);
}

/** „Rückgängig“ nach „Abgesagt“: die gelöschten Aufgaben unverändert zurückholen. */
export async function restoreTasks(rows: Record<string, unknown>[]) {
  if (!rows.length) return true;
  const { error } = await createClient().from("tasks").insert(rows);
  return !error;
}

/** „Rückgängig“: die eben angelegten Standard-Aufgaben wieder entfernen. false = hat nicht geklappt. */
export async function removeTasks(ids: string[]) {
  if (!ids.length) return true;
  const { error } = await createClient().from("tasks").delete().in("id", ids);
  return !error;
}
