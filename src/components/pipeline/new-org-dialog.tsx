"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useTeam } from "@/components/app-shell/team-provider";
import { ROLE_NAMES, type Organization, type Role } from "@/lib/pipeline";

// „+ Firma“: Name, Rollen, Prio, Zuständig. Warnt bei gleichem Namen (Doppelte vermeiden).

const field =
  "h-10 w-full rounded-[9px] border border-field bg-card px-3 text-[14px] text-fg placeholder:text-fg-3 focus-visible:outline-solid";

export function NewOrgDialog({
  open,
  onOpenChange,
  defaultRole,
  existing,
  onCreate,
  onOpenExisting,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultRole: Role;
  existing: Organization[];
  onCreate: (input: { name: string; roles: Role[]; prio: Organization["prio"]; owner_id: string | null }) => Promise<boolean>;
  onOpenExisting: (id: string) => void;
}) {
  const { me, people } = useTeam();
  const [name, setName] = useState("");
  const [roles, setRoles] = useState<Role[]>([defaultRole]);
  const [prio, setPrio] = useState("");
  const [owner, setOwner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ownerValue = owner ?? me?.id ?? "";
  const twin = existing.find((o) => o.name.trim().toLowerCase() === name.trim().toLowerCase());

  const reset = () => {
    setName("");
    setRoles([defaultRole]);
    setPrio("");
    setOwner(null);
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !roles.length) return;
    setBusy(true);
    setError(null);
    const ok = await onCreate({
      name: name.trim(),
      roles,
      prio: (prio || null) as Organization["prio"],
      owner_id: ownerValue || null,
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
          <DialogTitle className="text-base font-semibold">Firma zur Pipeline hinzufügen</DialogTitle>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3.5">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] text-fg-2">Name</span>
            <input autoFocus required value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Nordwerk Analytics" className={field} />
          </label>
          {twin && (
            <p className="text-[12.5px] text-st-amber">
              „{twin.name}“ gibt es schon.{" "}
              <button
                type="button"
                className="underline underline-offset-4"
                onClick={() => {
                  onOpenExisting(twin.id);
                  onOpenChange(false);
                }}
              >
                Öffnen
              </button>
            </p>
          )}
          <fieldset className="flex flex-col gap-1.5">
            <legend className="pb-1.5 text-[13px] text-fg-2">Rolle</legend>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(ROLE_NAMES) as Role[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={roles.includes(r)}
                  onClick={() => setRoles((list) => (list.includes(r) ? list.filter((x) => x !== r) : [...list, r]))}
                  className={cn(
                    "h-8 rounded-full px-3 text-[13px] transition-colors duration-150",
                    roles.includes(r) ? "bg-active text-fg shadow-[inset_0_0_0_1px_var(--line2)]" : "text-fg-2 shadow-[inset_0_0_0_1px_var(--line)] hover:text-fg"
                  )}
                >
                  {ROLE_NAMES[r]}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="grid grid-cols-[1fr_2fr] gap-2.5">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] text-fg-2">Prio</span>
              <select value={prio} onChange={(e) => setPrio(e.target.value)} className={field}>
                <option value="">–</option>
                <option>A</option>
                <option>B</option>
                <option>C</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] text-fg-2">Zuständig</span>
              <select value={ownerValue} onChange={(e) => setOwner(e.target.value)} className={field}>
                <option value="">Offen</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {error && (
            <p role="alert" className="text-[13px] text-st-red">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy || !name.trim() || !roles.length}
            className="h-10 rounded-[10px] bg-acc text-[14px] font-medium text-acc-text transition-[scale,opacity] duration-150 active:scale-[.97] disabled:opacity-50"
          >
            Anlegen
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
