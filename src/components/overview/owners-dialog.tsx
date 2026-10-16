"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useTeam } from "@/components/app-shell/team-provider";
import { Select } from "@/components/ui/select";
import { nameOptions } from "@/lib/options";

// „Zuständigkeiten verteilen“: je Bereich eine verantwortliche Person. Speichert sofort, gilt live für alle.
export function OwnersDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { areas, people, setAreaOwner } = useTeam();
  const [error, setError] = useState<string | null>(null);

  const change = async (areaId: string, value: string) => {
    setError(null);
    const ok = await setAreaOwner(areaId, value || null);
    if (!ok) setError("Hat nicht geklappt. Bitte nochmal versuchen.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-4 p-5 sm:max-w-[440px]">
        <div className="flex flex-col gap-1 pr-8">
          <DialogTitle className="text-base font-semibold">Zuständigkeiten verteilen</DialogTitle>
        </div>

        <div className="flex flex-col">
          {areas.map((a) => (
            <div key={a.id} className="flex min-h-12 items-center gap-3 border-t border-line first:border-t-0">
              <span className="size-2 shrink-0 rounded-full" style={{ background: a.color }} aria-hidden />
              <span className="flex-1 text-[14px]">{a.name}</span>
              <Select
                aria-label={`Zuständig für ${a.name}`}
                value={a.owner_id ?? ""}
                onChange={(v) => change(a.id, v)}
                options={nameOptions(people, "Noch offen")}
                className="h-9 w-[150px] rounded-[9px] border border-field bg-card pr-2.5 pl-3 text-[13.5px] text-fg hover:bg-hover max-md:h-11"
              />
            </div>
          ))}
        </div>

        {error && (
          <p role="alert" className="text-[13px] text-st-red">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
