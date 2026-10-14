"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useTeam } from "@/components/app-shell/team-provider";
import type { DecisionPatch } from "@/lib/data/use-knowledge";
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
  defaults = {},
  onCreate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  today: string;
  topics: Topic[];
  /** Vorbelegung, z. B. aus einem Termin (Bereich, „gehört zu“ im Format „typ:id“) */
  defaults?: { area_id?: string | null; topic?: string };
  onCreate: (input: DecisionPatch & { title: string; decided_on: string }) => Promise<boolean>;
}) {
  const { me, allAreas } = useTeam();
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [date, setDate] = useState<string | null>(null);
  const [who, setWho] = useState<string[] | null>(null);
  const [areaDraft, setArea] = useState<string | null>(null);
  const [topicDraft, setTopic] = useState<string | null>(null);
  const area = areaDraft ?? defaults.area_id ?? "";
  const topic = topicDraft ?? defaults.topic ?? "";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const whoValue = who ?? (me ? [me.id] : []);
  const reset = () => {
    setTitle("");
    setReason("");
    setDate(null);
    setWho(null);
    setArea(null);
    setTopic(null);
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
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3.5">
          <label className="flex flex-col gap-1.5">
            <span className={label}>Entscheidung</span>
            <input autoFocus required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Hack-Venue ist das HOIV" className={field} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={label}>Warum</span>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full resize-y rounded-[9px] border border-field bg-card px-3 py-2 text-[14px] leading-normal text-fg placeholder:text-fg-3 focus-visible:outline-solid max-md:text-base"
            />
          </label>
          <div className="flex flex-col gap-1.5">
            <span className={label}>Wer</span>
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
