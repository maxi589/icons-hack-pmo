"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { DateInput } from "@/components/ui/date-input";
import { useTeam } from "@/components/app-shell/team-provider";
import { nameOptions } from "@/lib/options";
import type { Milestone } from "@/lib/data/use-milestones";
import { DATE_MAX, DATE_MIN } from "./use-milestone-edit";

// „+ Meilenstein“ (Maxi, 16.10., Punkt 5): Titel, Datum, Bereich, optional „Teil von“. Die Nummer vergibt das Tool
// (M9 bzw. M3.5); alles Weitere (Beschreibung, Aufgaben) danach im Cockpit. Wählt man „Teil von“, übernimmt der Bereich
// den des Meilensteins, solange man ihn nicht selbst gesetzt hat.

const field =
  "h-10 w-full rounded-[9px] border border-field bg-card px-3 text-[14px] text-fg placeholder:text-fg-3 focus-visible:outline-solid max-md:h-11 max-md:text-base";

export type NewMilestoneInput = { title: string; due_date: string; area_id: string; parent_id: string | null };

export function NewMilestoneDialog({
  open,
  onOpenChange,
  milestones,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  milestones: Milestone[];
  onCreate: (input: NewMilestoneInput) => Promise<boolean>;
}) {
  const { allAreas } = useTeam();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [area, setArea] = useState<string | null>(null); // null = noch nicht angefasst
  const [parent, setParent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tops = milestones.filter((m) => !m.parent_id);
  const parentArea = tops.find((m) => m.id === parent)?.area_id ?? "";
  const areaValue = area ?? parentArea;
  const dateOk = !!due && due >= DATE_MIN && due <= DATE_MAX;

  const reset = () => {
    setTitle("");
    setDue("");
    setArea(null);
    setParent("");
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (!areaValue) return setError("Bitte einen Bereich wählen.");
    if (!dateOk) return setError("Datum bitte zwischen 1.10.2026 und 28.2.2027.");
    setBusy(true);
    setError(null);
    const ok = await onCreate({ title: title.trim(), due_date: due, area_id: areaValue, parent_id: parent || null });
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
      <DialogContent className="max-h-[92dvh] gap-4 overflow-y-auto p-5 sm:max-w-[460px]">
        <DialogTitle className="pr-8 text-base font-semibold">Neuer Meilenstein</DialogTitle>
        <form onSubmit={submit} className="flex flex-col gap-3.5">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] text-fg-2">Titel</span>
            <input autoFocus required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Catering fixiert" className={field} />
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] text-fg-2">Datum</span>
              <DateInput required min={DATE_MIN} max={DATE_MAX} value={due} onChange={(e) => setDue(e.target.value)} className={field} />
            </label>
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] text-fg-2">Bereich</span>
              <Select aria-label="Bereich" value={areaValue} onChange={setArea} options={nameOptions(allAreas, "Wählen")} className={field} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] text-fg-2">Teil von</span>
            <Select
              aria-label="Teil von"
              value={parent}
              onChange={setParent}
              options={[{ value: "", label: "Keinem (eigener Meilenstein)" }, ...tops.map((m) => ({ value: m.id, label: `${m.id} · ${m.title}` }))]}
              className={field}
            />
          </div>
          {error && (
            <p role="alert" className="text-[13px] text-st-red">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy || !title.trim() || !due}
            className="h-10 rounded-[10px] max-md:h-11 bg-acc text-[14px] font-medium text-acc-text transition-[scale,opacity] duration-150 active:scale-[.97] disabled:opacity-50"
          >
            Anlegen
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
