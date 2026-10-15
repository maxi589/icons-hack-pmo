// Feedback-Knopf (Plan Welle 1, Schritt 4): Kontext sammeln, Bildschirmfoto zeichnen, Feedback speichern.
// Das Foto wird im Browser aus der Seite gezeichnet (modern-screenshot, ohne Freigabe-Dialog). Einzelne Effekte können fehlen.

import { createClient } from "@/lib/supabase/client";

/** Empfänger in der Inbox (Initialen in `people`, die Mail steht nicht im Repo). */
export const FEEDBACK_TO = "MS";

export type FeedbackKind = "fehler" | "idee" | "sonstiges";
export type FeedbackStatus = "offen" | "umgesetzt" | "verworfen";

export const KIND_LABEL: Record<FeedbackKind, string> = { fehler: "Fehler", idee: "Idee", sonstiges: "Sonstiges" };
export const STATUS_LABEL: Record<FeedbackStatus, string> = { offen: "offen", umgesetzt: "umgesetzt", verworfen: "verworfen" };

/** Angeklickte Stelle („Stelle zeigen“): Rahmen im Bild plus Beschreibung fürs Umsetzen. */
export type FeedbackSpot = { rect: { x: number; y: number; w: number; h: number }; hint: string };

export type FeedbackContext = {
  viewport: string;
  device: "Handy" | "Desktop";
  browser: string;
  theme: "hell" | "dunkel";
  version: string;
  errors: { at: string; message: string }[];
  spot?: FeedbackSpot;
  userAgent: string;
};

export type Feedback = {
  id: string;
  author_id: string | null;
  body: string;
  kind: FeedbackKind | null;
  status: FeedbackStatus;
  page: string;
  context: Partial<FeedbackContext>;
  screenshot_path: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
};

const BUCKET = "feedback";
/** Elemente mit diesem Attribut fehlen im Bild (Feedback-Fenster, Auswahl-Rahmen). */
export const IGNORE_ATTR = "data-feedback-ignore";

// ---------------------------------------------------------------
// Letzte Fehlermeldungen der Seite (für „automatisch dabei“)
// ---------------------------------------------------------------
const errors: { at: string; message: string }[] = [];
let installed = false;

function remember(message: string) {
  const text = message.replace(/\s+/g, " ").trim().slice(0, 300);
  if (!text) return;
  errors.push({ at: new Date().toISOString(), message: text });
  if (errors.length > 10) errors.shift();
}

function describe(value: unknown): string {
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** Einmal im App-Rahmen: merkt sich Laufzeitfehler, abgelehnte Promises und console.error. */
export function installErrorLog() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("error", (e) => remember(e.message || describe(e.error)));
  window.addEventListener("unhandledrejection", (e) => remember(`Unbehandelt: ${describe(e.reason)}`));
  const original = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    remember(args.map(describe).join(" "));
    original(...args);
  };
}

// ---------------------------------------------------------------
// Kontext
// ---------------------------------------------------------------
function browserName(ua: string) {
  const name = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "macOS" : "";
  return os ? `${name} · ${os}` : name;
}

export function collectContext(spot?: FeedbackSpot): FeedbackContext {
  const ua = navigator.userAgent;
  return {
    viewport: `${window.innerWidth}×${window.innerHeight}`,
    device: window.matchMedia("(max-width: 767px)").matches ? "Handy" : "Desktop",
    browser: browserName(ua),
    theme: document.documentElement.classList.contains("dark") ? "dunkel" : "hell",
    version: process.env.NEXT_PUBLIC_APP_VERSION || "lokal",
    errors: [...errors],
    ...(spot ? { spot } : {}),
    userAgent: ua,
  };
}

/** Kurze Beschreibung des angeklickten Elements, damit man es im Code wiederfindet. */
export function describeElement(el: Element): string {
  const parts: string[] = [];
  const tag = el.tagName.toLowerCase();
  const label = el.getAttribute("aria-label") || el.getAttribute("title");
  parts.push(label ? `${tag} „${label}“` : tag);
  const text = (el as HTMLElement).innerText?.replace(/\s+/g, " ").trim();
  if (text && text !== label) parts.push(`Text „${text.length > 80 ? text.slice(0, 80) + " …" : text}“`);
  // Umgebung: nächste Überschrift, Region oder Detail-Fenster
  const region = el.closest("[data-detail], [role=dialog], section, nav, header, main, aside");
  const heading = region?.querySelector("h1, h2, h3, [data-slot=dialog-title], [data-slot=sheet-title]")?.textContent?.trim();
  if (region) parts.push(`in ${region.hasAttribute("data-detail") ? "Detail" : region.tagName.toLowerCase()}${heading ? ` „${heading.slice(0, 60)}“` : ""}`);
  return parts.join(" · ");
}

// ---------------------------------------------------------------
// Bildschirmfoto
// ---------------------------------------------------------------
/** Feedback-Fenster samt seinem abgedunkelten Hintergrund (Handy-Sheet) gehört nicht ins Bild. */
function ignored(el: Element) {
  if (el.hasAttribute(IGNORE_ATTR)) return true;
  return el.matches("[data-slot$=overlay]") && !!el.nextElementSibling?.hasAttribute(IGNORE_ATTR);
}

/**
 * Zeichnet den sichtbaren Bildschirm in ein JPEG (ohne Feedback-Fenster). Mit `spot` wird die Stelle eingerahmt.
 * Am Handy scrollt die ganze Seite: dann wird der sichtbare Ausschnitt aus dem Gesamtbild geschnitten.
 */
export async function captureScreen(spot?: FeedbackSpot): Promise<Blob | null> {
  try {
    const { domToCanvas } = await import("modern-screenshot");
    const body = document.body;
    const scale = Math.min(window.devicePixelRatio || 1, 1.5);
    const full = await domToCanvas(body, {
      scale,
      backgroundColor: getComputedStyle(body).backgroundColor,
      filter: (node) => !(node instanceof Element && ignored(node)),
      timeout: 8000,
    });
    const w = window.innerWidth;
    const h = window.innerHeight;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(full, 0, Math.round(window.scrollY * scale), canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
    if (spot) {
      const accent = getComputedStyle(document.documentElement).getPropertyValue("--accLine").trim() || "#0f5ba5";
      const pad = 4;
      ctx.lineWidth = 3 * scale;
      ctx.strokeStyle = accent;
      ctx.strokeRect((spot.rect.x - pad) * scale, (spot.rect.y - pad) * scale, (spot.rect.w + pad * 2) * scale, (spot.rect.h + pad * 2) * scale);
    }
    return await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  } catch (e) {
    console.warn("Bildschirmfoto fehlgeschlagen", e);
    return null;
  }
}

// ---------------------------------------------------------------
// Speichern
// ---------------------------------------------------------------
export async function sendFeedback(input: {
  body: string;
  kind: FeedbackKind | null;
  screenshot: Blob | null;
  spot?: FeedbackSpot;
  authorId: string;
  recipientId: string | null;
}): Promise<boolean> {
  const supabase = createClient();
  const id = crypto.randomUUID();
  let screenshot_path: string | null = null;
  if (input.screenshot) {
    const path = `${new Date().toISOString().slice(0, 7)}/${id}.jpg`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, input.screenshot, { contentType: "image/jpeg", upsert: false });
    // Ohne Bild trotzdem senden: Der Text ist das Wichtigste.
    if (!error) screenshot_path = path;
  }
  const { error } = await supabase.from("feedback").insert({
    id,
    author_id: input.authorId,
    body: input.body.trim(),
    kind: input.kind,
    page: window.location.pathname + window.location.search,
    context: collectContext(input.spot),
    screenshot_path,
  });
  if (error) {
    if (screenshot_path) await supabase.storage.from(BUCKET).remove([screenshot_path]);
    return false;
  }
  if (input.recipientId) {
    await supabase.from("notifications").insert({
      recipient_id: input.recipientId,
      kind: "feedback",
      target_type: "feedback",
      target_id: id,
      actor_id: input.authorId,
    });
  }
  return true;
}

export async function loadFeedback(id: string): Promise<Feedback | null> {
  const { data } = await createClient().from("feedback").select("*").eq("id", id).maybeSingle();
  return (data as Feedback | null) ?? null;
}

export async function screenshotUrl(path: string) {
  const { data } = await createClient().storage.from(BUCKET).createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
}

export async function setFeedbackStatus(id: string, status: FeedbackStatus, by: string | null) {
  const done = status !== "offen";
  const { error } = await createClient()
    .from("feedback")
    .update({ status, resolved_by: done ? by : null, resolved_at: done ? new Date().toISOString() : null })
    .eq("id", id);
  return !error;
}

/** „Dein Feedback ist umgesetzt“ an die absendende Person. */
export async function notifyDone(feedback: Pick<Feedback, "id" | "author_id">, actorId: string) {
  if (!feedback.author_id || feedback.author_id === actorId) return;
  await createClient().from("notifications").insert({
    recipient_id: feedback.author_id,
    kind: "feedback_done",
    target_type: "feedback",
    target_id: feedback.id,
    actor_id: actorId,
  });
}
