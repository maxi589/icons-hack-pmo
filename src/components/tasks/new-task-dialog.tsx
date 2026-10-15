"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useTeam } from "@/components/app-shell/team-provider";
import type { Milestone } from "@/lib/data/use-milestones";
import { milestoneOptions } from "@/lib/tasks";

// „+ Aufgabe“: Titel, Zuständig (vorbelegt mit dir), Fällig, Bereich, Meilenstein.
// Vorbelegung aus den aktiven Filtern der Seite, damit die neue Aufgabe gleich sichtbar bleibt.

const field =
  "h-10 w-full rounded-[9px] border border-field bg-card px-3 text-[14px] text-fg placeholder:text-fg-3 focus-visible:outline-solid max-md:text-base";

export type NewTaskInput = {
  title: string;
  assignee_id: string | null;
  due_date: string | null;
  area_id: string | null;
  milestone_id: string | null;
};

export function NewTaskDialog({
  open,
  onOpenChange,
  milestones,
  defaults,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  milestones: Milestone[];
  defaults: { assignee_id?: string | null; area_id?: string | null; milestone_id?: string | null };
  onCreate: (input: NewTaskInput) => Promise<boolean>;
}) {
  const { me, people, allAreas } = useTeam();
  // null = noch nicht angefasst, dann gilt die Vorbelegung
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState<string | null>(null);
  const [due, setDue] = useState("");
  const [area, setArea] = useState<string | null>(null);
  const [milestone, setMilestone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const msValue = milestone ?? defaults.milestone_id ?? "";
  const msArea = milestones.find((m) => m.id === msValue)?.area_id ?? "";
  const assigneeValue = assignee ?? (defaults.assignee_id !== undefined ? defaults.assignee_id ?? "" : me?.id ?? "");
  const areaValue = area ?? defaults.area_id ?? msArea;

  const reset = () => {
    setTitle("");
    setAssignee(null);
    setDue("");
    setArea(null);
    setMilestone(null);
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    const ok = await onCreate({
      title: title.trim(),
      assignee_id: assigneeValue || null,
      due_date: due || null,
      area_id: areaValue || null,
      milestone_id: msValue || null,
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
      <DialogContent className="gap-4 p-5 sm:max-w-[460px]">
        <div className="flex flex-col gap-1 pr-8">
          <DialogTitle className="text-base font-semibold">Neue Aufgabe</DialogTitle>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3.5">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] text-fg-2">Titel</span>
            <input autoFocus required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Pitch Deck an Jury-Liste anpassen" className={field} />
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] text-fg-2">Zuständig</span>
              <select value={assigneeValue} onChange={(e) => setAssignee(e.target.value)} className={field}>
                <option value="">Offen</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] text-fg-2">Fällig</span>
              <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={field} />
            </label>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] text-fg-2">Meilenstein</span>
            <select value={msValue} onChange={(e) => setMilestone(e.target.value)} className={field}>
              <option value="">Keiner</option>
              {milestoneOptions(milestones).map((m) => (
                <option key={m.id} value={m.id}>
                  {`${m.parent_id ? "   " : ""}${m.id} · ${m.title}`}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] text-fg-2">Bereich</span>
            <select value={areaValue} onChange={(e) => setArea(e.target.value)} className={field}>
              <option value="">Keiner</option>
              {allAreas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          {error && (
            <p role="alert" className="text-[13px] text-st-red">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy || !title.trim()}
            className="h-10 rounded-[10px] bg-acc text-[14px] font-medium text-acc-text transition-[scale,opacity] duration-150 active:scale-[.97] disabled:opacity-50"
          >
            Anlegen
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
