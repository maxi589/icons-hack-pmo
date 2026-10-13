"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useTeam } from "@/components/app-shell/team-provider";
import type { DecisionPatch, LinkItem } from "@/lib/data/use-knowledge";
import { parseTopic, PeoplePicker, TopicOptions, type Topic } from "./pickers";

const field =
  "h-10 w-full rounded-[9px] border border-field bg-card px-3 text-[14px] text-fg placeholder:text-fg-3 focus-visible:outline-solid max-md:text-base";
const label = "text-[13px] text-fg-2";
const submitCls =
  "h-10 rounded-[10px] bg-acc text-[14px] font-medium text-acc-text transition-[scale,opacity] duration-150 active:scale-[.97] disabled:opacity-50";

// ---------------------------------------------------------------
// Neue Entscheidung (Taste E): was, warum, wann (heute), wer (du), Bereich, Thema
// ---------------------------------------------------------------
export function NewDecisionDialog({
  open,
  onOpenChange,
  today,
  topics,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  today: string;
  topics: Topic[];
  onCreate: (input: DecisionPatch & { title: string; decided_on: string }) => Promise<boolean>;
}) {
  const { me, allAreas } = useTeam();
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [date, setDate] = useState<string | null>(null);
  const [who, setWho] = useState<string[] | null>(null);
  const [area, setArea] = useState("");
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const whoValue = who ?? (me ? [me.id] : []);
  const reset = () => {
    setTitle("");
    setReason("");
    setDate(null);
    setWho(null);
    setArea("");
    setTopic("");
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    const ok = await onCreate({
      title: title.trim(),
      reason: reason.trim() || null,
      decided_on: date ?? today,
      decided_by: whoValue,
      area_id: area || null,
      ...parseTopic(topic),
      created_by: me?.id ?? null,
    });
    setBusy(false);
    if (ok) {
      reset();
      onOpenChange(false);
    } else setError("Hat nicht geklappt. Bitte nochmal versuchen.");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[92dvh] gap-4 overflow-y-auto p-5 sm:max-w-[500px]">
        <div className="flex flex-col gap-1 pr-8">
          <DialogTitle className="text-base font-semibold">Entscheidung festhalten</DialogTitle>
          <DialogDescription className="text-[13px] text-fg-2">Was nicht im Tool steht, gilt nicht als vereinbart.</DialogDescription>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3.5">
          <label className="flex flex-col gap-1.5">
            <span className={label}>Was wurde entschieden?</span>
            <input autoFocus required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Hack-Venue ist das HOIV" className={field} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={label}>Warum</span>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Begründung, Alternativen, was dagegen sprach"
              className="w-full resize-y rounded-[9px] border border-field bg-card px-3 py-2 text-[14px] leading-normal text-fg placeholder:text-fg-3 focus-visible:outline-solid max-md:text-base"
            />
          </label>
          <div className="flex flex-col gap-1.5">
            <span className={label}>Wer hat entschieden?</span>
            <PeoplePicker value={whoValue} onChange={setWho} />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <label className="flex flex-col gap-1.5">
              <span className={label}>Wann</span>
              <input type="date" required value={date ?? today} onChange={(e) => setDate(e.target.value)} className={field} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={label}>Bereich</span>
              <select value={area} onChange={(e) => setArea(e.target.value)} className={field}>
                <option value="">Keiner</option>
                {allAreas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className={label}>Gehört zu</span>
            <select value={topic} onChange={(e) => setTopic(e.target.value)} className={field}>
              <TopicOptions topics={topics} />
            </select>
          </label>
          {error && (
            <p role="alert" className="text-[13px] text-st-red">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy || !title.trim()} className={submitCls}>
            Festhalten
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------
// Link hinzufügen oder bearbeiten (Pitch Deck, Website, Luma …)
// ---------------------------------------------------------------

/** „luma.com/abc“ → „https://luma.com/abc“; nur http(s) erlaubt. */
export function normalizeUrl(raw: string) {
  const v = raw.trim();
  if (!v) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withScheme);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export function LinkDialog({
  open,
  onOpenChange,
  link,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** null = neuer Link */
  link: LinkItem | null;
  onSave: (input: { title: string; url: string }) => Promise<boolean>;
}) {
  const [title, setTitle] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleValue = title ?? link?.title ?? "";
  const urlValue = url ?? link?.url ?? "";
  const reset = () => {
    setTitle(null);
    setUrl(null);
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = normalizeUrl(urlValue);
    if (!clean) {
      setError("Bitte eine gültige Adresse eingeben, z. B. luma.com/icons-hackathon");
      return;
    }
    setBusy(true);
    setError(null);
    const ok = await onSave({ title: titleValue.trim() || new URL(clean).hostname.replace(/^www\./, ""), url: clean });
    setBusy(false);
    if (ok) {
      reset();
      onOpenChange(false);
    } else setError("Hat nicht geklappt. Bitte nochmal versuchen.");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="gap-4 p-5 sm:max-w-[440px]">
        <div className="flex flex-col gap-1 pr-8">
          <DialogTitle className="text-base font-semibold">{link ? "Link bearbeiten" : "Link hinzufügen"}</DialogTitle>
          <DialogDescription className="text-[13px] text-fg-2">Für alles, was das Team immer wieder sucht: Pitch Deck, Website, Luma, Drive-Ordner.</DialogDescription>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3.5">
          <label className="flex flex-col gap-1.5">
            <span className={label}>Adresse</span>
            <input
              autoFocus={!link}
              required
              inputMode="url"
              value={urlValue}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              className={field}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={label}>Name</span>
            <input value={titleValue} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Pitch Deck Partner" className={field} />
          </label>
          {error && (
            <p role="alert" className="text-[13px] text-st-red">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy || !urlValue.trim()} className={submitCls}>
            Speichern
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
