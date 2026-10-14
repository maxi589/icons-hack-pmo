"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useTeam } from "@/components/app-shell/team-provider";
import { PeoplePicker } from "@/components/wissen/pickers";
import { DURATIONS, durationLabel } from "@/lib/meetings";

// „+ Termin“ (Taste T): nötig sind nur Titel und Zeit, der Rest ist freiwillig und lässt sich im Detail ergänzen.
// Kein Meet-Link hier: Er kommt aus Google, nachdem man den Termin dort eingetragen hat.
// Vorbelegung aus der Wochenansicht (gezogener Zeitraum) bzw. aus Bereich oder Firma.

const field =
  "h-10 w-full rounded-[9px] border border-field bg-card px-3 text-[14px] text-fg placeholder:text-fg-3 focus-visible:outline-solid max-md:text-base";
const label = "text-[13px] text-fg-2";

export type NewMeetingInput = {
  title: string;
  date: string;
  time: string;
  duration_min: number;
  attendees: string[];
  area_id: string | null;
};

export type MeetingDefaults = { date: string; time: string; duration_min?: number; area_id?: string | null };

export function NewMeetingDialog({
  open,
  onOpenChange,
  defaults,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaults: MeetingDefaults;
  onCreate: (input: NewMeetingInput) => Promise<boolean>;
}) {
  const { me, people, allAreas } = useTeam();
  // null = noch nicht angefasst, dann gilt die Vorbelegung
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [who, setWho] = useState<string[] | null>(null);
  const [area, setArea] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const whoValue = who ?? (me ? [me.id] : []);
  const durValue = duration ?? defaults.duration_min ?? 60;
  const reset = () => {
    setTitle("");
    setDate(null);
    setTime(null);
    setDuration(null);
    setWho(null);
    setArea(null);
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    const ok = await onCreate({
      title: title.trim(),
      date: date ?? defaults.date,
      time: time ?? defaults.time,
      duration_min: durValue,
      attendees: whoValue,
      area_id: (area ?? defaults.area_id ?? "") || null,
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
      <DialogContent className="max-h-[92dvh] gap-4 overflow-y-auto p-5 sm:max-w-[480px]">
        <DialogTitle className="pr-8 text-base font-semibold">Neuer Termin</DialogTitle>
        <form onSubmit={submit} className="flex flex-col gap-3.5">
          <label className="flex flex-col gap-1.5">
            <span className={label}>Titel</span>
            <input autoFocus required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Jour fixe" className={field} />
          </label>
          <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2.5">
            <label className="flex flex-col gap-1.5">
              <span className={label}>Datum</span>
              <input type="date" required value={date ?? defaults.date} onChange={(e) => setDate(e.target.value)} className={field} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={label}>Beginn</span>
              <input type="time" step={300} required value={time ?? defaults.time} onChange={(e) => setTime(e.target.value)} className={field} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={label}>Dauer</span>
              <select value={durValue} onChange={(e) => setDuration(Number(e.target.value))} className={field}>
                {[...new Set([...DURATIONS, durValue])]
                  .sort((a, b) => a - b)
                  .map((d) => (
                    <option key={d} value={d}>
                      {durationLabel(d)}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center justify-between">
              <span className={label}>Wer</span>
              <button
                type="button"
                onClick={() => setWho(whoValue.length === people.length ? (me ? [me.id] : []) : people.map((p) => p.id))}
                className="rounded-md text-[12.5px] text-fg-2 hover:text-fg max-md:min-h-10"
              >
                {whoValue.length === people.length ? "Nur ich" : "Ganzes Team"}
              </button>
            </span>
            <PeoplePicker label="Wer ist dabei" value={whoValue} onChange={setWho} />
          </div>
          <label className="flex flex-col gap-1.5">
              <span className={label}>Bereich</span>
              <select value={area ?? defaults.area_id ?? ""} onChange={(e) => setArea(e.target.value)} className={field}>
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
