"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink, Link2, X } from "lucide-react";
import { EditText, miniButton as mini, PropRow, SelectBox } from "@/components/detail-fields";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/avatar";
import { Chip } from "@/components/chip";
import { Feed } from "@/components/feed";
import { useTeam } from "@/components/app-shell/team-provider";
import { notifyAssignment } from "@/lib/data/use-feed";
import { formatDayMonth } from "@/lib/dates";
import type { OrgPatch } from "@/lib/data/use-organizations";
import {
  followState,
  initials,
  nextStage,
  ROLE_NAMES,
  shiftFollowUp,
  STAGES,
  stageName,
  type Organization,
  type Role,
  type Stage,
} from "@/lib/pipeline";

// Firmen-Detail (Board „Pipeline“, rechts 400px; am Handy als Bottom Sheet).
// Felder speichern beim Verlassen (Text) bzw. sofort (Auswahl). Stufe mit „Rückgängig“ über die Seite.

export function OrgDetail({
  org,
  today,
  onUpdate,
  onStage,
  onClose,
}: {
  org: Organization;
  today: string;
  onUpdate: (patch: OrgPatch) => void;
  onStage: (to: Stage) => void;
  onClose: () => void;
}) {
  const { me, people, personById } = useTeam();
  const [copied, setCopied] = useState(false);
  const next = nextStage(org.stage);
  const follow = followState(org, today);
  const stage = STAGES.find((s) => s.id === org.stage)!;
  const isVenue = org.roles.includes("venue");
  const f = (name: string) => `org-${org.id}-${name}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/pipeline?firma=${org.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleRole = (r: Role) => {
    const roles = org.roles.includes(r) ? org.roles.filter((x) => x !== r) : [...org.roles, r];
    if (roles.length) onUpdate({ roles });
  };

  return (
    <div className="flex flex-col">
      {/* Kopf */}
      <div className="flex flex-col gap-3 border-b border-line px-[18px] pt-4 pb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-active text-[12px] font-semibold text-fg-2" aria-hidden>
            {initials(org.name)}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h2 className="truncate text-base font-semibold tracking-[-0.01em]">{org.name}</h2>
            <span className="truncate text-[12px] text-fg-3">
              {[org.prio && `Prio ${org.prio}`, org.wave && `Welle ${org.wave}`, org.roles.map((r) => ROLE_NAMES[r]).join(", ")]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
          <button type="button" onClick={copyLink} className={mini} aria-label="Link zu dieser Firma kopieren">
            <Link2 className="mr-1 size-3.5" aria-hidden />
            <span aria-live="polite">{copied ? "Kopiert" : "Link"}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-lg text-fg-3 hover:bg-hover hover:text-fg"
            aria-label="Detail schließen"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        {/* Stufe: am Handy als 48px-Zeilen zum Antippen, am Desktop als Auswahl plus „Weiter zu …“ */}
        <div className="hidden flex-wrap items-center gap-1.5 md:flex">
          <span className="relative inline-flex h-7 items-center rounded-lg shadow-[inset_0_0_0_1px_var(--line2)]">
            <span className={cn("pointer-events-none absolute left-2.5 size-[7px] rounded-full", stage.dot)} aria-hidden />
            <select
              aria-label="Stufe"
              value={org.stage}
              onChange={(e) => onStage(e.target.value as Stage)}
              className="h-7 cursor-pointer appearance-none rounded-lg bg-transparent pr-7 pl-6 text-[12.5px] text-fg"
            >
              {STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 size-3.5 text-fg-3" aria-hidden />
          </span>
          {next && (
            <button
              type="button"
              onClick={() => onStage(next)}
              className="inline-flex h-7 items-center rounded-[9px] bg-acc px-3 text-[12.5px] font-medium text-acc-text transition-[scale] duration-150 active:scale-[.97]"
            >
              Weiter zu „{stageName(next)}“
            </button>
          )}
        </div>
        <fieldset className="flex flex-col md:hidden">
          <legend className="label-mono pb-1.5">Stufe</legend>
          {STAGES.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={org.stage === s.id}
              onClick={() => onStage(s.id)}
              className={cn("flex min-h-12 items-center gap-3 rounded-xl px-3.5 text-left text-[15px]", org.stage === s.id && "bg-active font-medium")}
            >
              <span className={cn("size-[9px] rounded-full", s.dot)} aria-hidden />
              <span className="flex-1">{s.name}</span>
              {org.stage === s.id && <span className="text-[13px] text-fg-3">aktuell</span>}
            </button>
          ))}
        </fieldset>
      </div>

      {/* Eigenschaften */}
      <div className="flex flex-col border-b border-line px-[18px] py-2.5">
        <PropRow label="Zuständig" htmlFor={f("owner")}>
          <span className="flex items-center gap-1">
            <Avatar person={personById(org.owner_id)} size={20} />
            <span className="flex-1">
              <SelectBox
                id={f("owner")}
                value={org.owner_id ?? ""}
                onChange={(v) => {
                  onUpdate({ owner_id: v || null });
                  notifyAssignment("organization", org.id, me?.id ?? null, v || null);
                }}
              >
                <option value="">Noch offen</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </SelectBox>
            </span>
          </span>
        </PropRow>
        <PropRow label="Nachfassen" htmlFor={f("follow")}>
          <span className="flex flex-wrap items-center gap-1.5">
            {follow && <Chip tone={follow.tone}>{follow.label}</Chip>}
            <input
              id={f("follow")}
              type="date"
              value={org.next_follow_up ?? ""}
              onChange={(e) => onUpdate({ next_follow_up: e.target.value || null })}
              className="h-8 rounded-lg bg-transparent px-2 text-[13px] text-fg tabular hover:bg-hover"
            />
            <button type="button" className={mini} onClick={() => onUpdate({ next_follow_up: shiftFollowUp(org.next_follow_up, today, 2) })}>
              +2 Tage
            </button>
            <button type="button" className={mini} onClick={() => onUpdate({ next_follow_up: shiftFollowUp(org.next_follow_up, today, 7) })}>
              +1 Woche
            </button>
          </span>
        </PropRow>
        <PropRow label="Prio" htmlFor={f("prio")}>
          <SelectBox id={f("prio")} value={org.prio ?? ""} onChange={(v) => onUpdate({ prio: (v || null) as Organization["prio"] })}>
            <option value="">Keine</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </SelectBox>
        </PropRow>
        <PropRow label="Welle" htmlFor={f("wave")}>
          <SelectBox id={f("wave")} value={org.wave ? String(org.wave) : ""} onChange={(v) => onUpdate({ wave: v ? Number(v) : null })}>
            <option value="">Keine</option>
            <option value="1">Welle 1 (ab 19.10.)</option>
            <option value="2">Welle 2 (ab 2.11.)</option>
            <option value="3">Welle 3 (ab 16.11.)</option>
          </SelectBox>
        </PropRow>
        <PropRow label="Warm über" htmlFor={f("warm")}>
          <EditText id={f("warm")} value={org.warm_via} placeholder="Wer kennt jemanden dort?" onSave={(v) => onUpdate({ warm_via: v })} />
        </PropRow>
        <PropRow label="Bestehend" htmlFor={f("existing")}>
          <EditText
            id={f("existing")}
            value={org.existing_contact}
            placeholder="z. B. Talent Elevator, Coop"
            onSave={(v) => onUpdate({ existing_contact: v })}
          />
        </PropRow>
        <PropRow label="Ansprechperson" htmlFor={f("contact")}>
          <EditText id={f("contact")} value={org.contact_person} placeholder="Name, Rolle" onSave={(v) => onUpdate({ contact_person: v })} />
        </PropRow>
        <PropRow label="Kontakt" htmlFor={f("info")}>
          <EditText id={f("info")} value={org.contact_info} placeholder="Mail oder Telefon" onSave={(v) => onUpdate({ contact_info: v })} />
        </PropRow>
        <PropRow label="Link" htmlFor={f("url")}>
          <span className="flex items-center gap-1">
            <EditText id={f("url")} value={org.url} placeholder="https://…" onSave={(v) => onUpdate({ url: v })} />
            {org.url && /^https?:\/\//.test(org.url) && (
              <a
                href={org.url}
                target="_blank"
                rel="noreferrer"
                className="grid size-8 shrink-0 place-items-center rounded-lg text-fg-3 hover:bg-hover hover:text-fg"
                aria-label="Link öffnen"
              >
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
            )}
          </span>
        </PropRow>
        {isVenue && (
          <>
            <PropRow label="Lage" htmlFor={f("loc")}>
              <EditText id={f("loc")} value={org.location} placeholder="Adresse" onSave={(v) => onUpdate({ location: v })} />
            </PropRow>
            <PropRow label="Kapazität" htmlFor={f("cap")}>
              <EditText id={f("cap")} value={org.capacity} placeholder="z. B. 120 Personen" onSave={(v) => onUpdate({ capacity: v })} />
            </PropRow>
            <PropRow label="Übernachtung" htmlFor={f("night")}>
              <EditText id={f("night")} value={org.overnight} placeholder="z. B. Ja (24h offen)" onSave={(v) => onUpdate({ overnight: v })} />
            </PropRow>
            <PropRow label="Preis / Deal" htmlFor={f("price")}>
              <EditText id={f("price")} value={org.price} placeholder="z. B. kostenlos" onSave={(v) => onUpdate({ price: v })} />
            </PropRow>
          </>
        )}
        {org.stage === "abgesagt" && (
          <PropRow label="Grund" htmlFor={f("lost")}>
            <EditText id={f("lost")} value={org.lost_reason} placeholder="Warum abgesagt?" onSave={(v) => onUpdate({ lost_reason: v })} />
          </PropRow>
        )}
        <PropRow label="Rollen">
          <span className="flex flex-wrap gap-1 py-1">
            {(Object.keys(ROLE_NAMES) as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={org.roles.includes(r)}
                onClick={() => toggleRole(r)}
                className={cn(
                  "h-[26px] rounded-full px-2.5 text-[12px] transition-colors duration-150",
                  org.roles.includes(r) ? "bg-active text-fg shadow-[inset_0_0_0_1px_var(--line2)]" : "text-fg-3 hover:text-fg-2"
                )}
              >
                {ROLE_NAMES[r]}
              </button>
            ))}
          </span>
        </PropRow>
        <div className="flex flex-col gap-1 py-1.5">
          <label htmlFor={f("notes")} className="text-[13px] text-fg-3">
            Notizen
          </label>
          <EditText id={f("notes")} value={org.notes} placeholder="Was sollte das Team wissen?" onSave={(v) => onUpdate({ notes: v })} multiline />
        </div>
      </div>

      {/* Verlauf und Kommentare */}
      <div className="px-[18px] pt-3.5 pb-6">
        <Feed
          targetType="organization"
          targetId={org.id}
          describe={(a) =>
            a.action === "stage_changed"
              ? `hat die Stufe auf ${stageName(a.data.to as Stage)} gesetzt`
              : a.action === "created"
                ? "hat die Firma angelegt"
                : a.action === "followed_up"
                  ? `hat nachgefasst${a.data.next ? `, nächstes Mal ${formatDayMonth(String(a.data.next))}` : ""}`
                  : a.action === "imported"
                  ? `hat die Firma aus ${String(a.data.source ?? "der Excel").replace(/ Z\. \d+$/, "")} übernommen`
                  : a.action
          }
        />
      </div>
    </div>
  );
}
