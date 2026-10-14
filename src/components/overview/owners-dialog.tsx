"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useTeam } from "@/components/app-shell/team-provider";

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
            <label key={a.id} className="flex min-h-12 items-center gap-3 border-t border-line first:border-t-0">
              <span className="size-2 shrink-0 rounded-full" style={{ background: a.color }} aria-hidden />
              <span className="flex-1 text-[14px]">{a.name}</span>
              <span className="relative">
                <select
                  value={a.owner_id ?? ""}
                  onChange={(e) => change(a.id, e.target.value)}
                  className="h-9 w-[150px] cursor-pointer appearance-none rounded-[9px] border border-field bg-card pr-8 pl-3 text-[13.5px] text-fg transition-colors duration-150 hover:bg-hover"
                >
                  <option value="">Noch offen</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-fg-3" aria-hidden />
              </span>
            </label>
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
