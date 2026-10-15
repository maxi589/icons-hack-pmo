"use client";

import { ChevronDown, ExternalLink, X } from "lucide-react";
import { CopyLinkButton } from "@/components/copy-link-button";
import { EditText, miniButton as mini, PropRow, SelectBox } from "@/components/detail-fields";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/avatar";
import { Feed } from "@/components/feed";
import { useTeam } from "@/components/app-shell/team-provider";
import { notifyAssignment } from "@/lib/data/use-feed";
import { formatDayMonth, formatShort, todayInVienna } from "@/lib/dates";
import type { OrgPatch } from "@/lib/data/use-organizations";
import { DocBlock } from "@/components/dokumente/doc-block";
import { MeetingBlock } from "@/components/termine/meeting-block";
import {
  followState,
  initials,
  nextStage,
  ROLE_NAMES,
  shiftFollowUp,
  STAGES,
  stageName,
  type Organization,
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
  const next = nextStage(org.stage);
  const follow = followState(org, today);
  const stage = STAGES.find((s) => s.id === org.stage)!;
  const isVenue = org.roles.includes("venue");
  const hasUrl = !!org.url && /^https?:\/\//.test(org.url);
  const f = (name: string) => `org-${org.id}-${name}`;

  // Warmer Kontakt = wer aus icons jemanden dort kennt; eine bestehende Verbindung (TE, Coop) steht klein darunter.
  const warmRow = (
    <PropRow label="Warm über" htmlFor={f("warm")}>
      <span className="flex flex-col">
        <EditText id={f("warm")} value={org.warm_via} placeholder="–" onSave={(v) => onUpdate({ warm_via: v })} />
        {org.existing_contact && <span className="px-2 pb-1 text-[12px] text-fg-3">Bestehend: {org.existing_contact}</span>}
      </span>
    </PropRow>
  );

  return (
    <div className="flex flex-col">
      {/* Kopf */}
      <div className="flex flex-col gap-3 border-b border-line px-[18px] pt-4 pb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-active text-[12px] font-semibold text-fg-2" aria-hidden>
            {initials(org.name)}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            {/* Umbrechen statt abschneiden: Venue-Namen aus der Liste sind bis 56 Zeichen lang (gemessen 15.10.) */}
            <h2 className="text-base leading-snug font-semibold tracking-[-0.01em] break-words">{org.name}</h2>
            <span className="truncate text-[12px] text-fg-3">
              {[org.roles.map((r) => ROLE_NAMES[r]).join(", "), org.category, !isVenue && org.location]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
          {hasUrl && (
            <a
              href={org.url!}
              target="_blank"
              rel="noreferrer"
              title="Website öffnen"
              className="grid size-8 shrink-0 place-items-center rounded-lg text-fg-3 hover:bg-hover hover:text-fg max-md:size-11"
              aria-label="Website öffnen"
            >
              <ExternalLink className="size-4" aria-hidden />
            </a>
          )}
          <CopyLinkButton path={`/pipeline?firma=${org.id}`} label="Link zu dieser Firma kopieren" />
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
          <span className="flex items-center gap-1">
            <input
              id={f("follow")}
              type="date"
              value={org.next_follow_up ?? ""}
              onChange={(e) => onUpdate({ next_follow_up: e.target.value || null })}
              aria-describedby={follow && follow.tone !== "gray" ? f("follow-state") : undefined}
              className={cn(
                // min-w-0 + flex-1: Datum gibt nach, damit „+1 W“ auch auf 375px-Handys sichtbar bleibt
                "h-8 min-w-0 flex-1 rounded-lg bg-transparent px-2 text-[13px] tabular hover:bg-hover max-md:[&::-webkit-calendar-picker-indicator]:hidden md:flex-none",
                follow?.tone === "red" ? "font-medium text-st-red" : follow?.tone === "today" ? "font-medium text-acc-line" : "text-fg"
              )}
            />
            {follow && follow.tone !== "gray" && (
              <span id={f("follow-state")} className="sr-only">
                {follow.label}
              </span>
            )}
            <span className="ml-auto flex shrink-0 gap-1">
              <button type="button" className={mini} title="Um 2 Tage verschieben" onClick={() => onUpdate({ next_follow_up: shiftFollowUp(org.next_follow_up, today, 2) })}>
                +2 T
              </button>
              <button type="button" className={mini} title="Um 1 Woche verschieben" onClick={() => onUpdate({ next_follow_up: shiftFollowUp(org.next_follow_up, today, 7) })}>
                +1 W
              </button>
            </span>
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
        {!isVenue && warmRow}
        <PropRow label="Ansprechperson" htmlFor={f("contact")}>
          <EditText id={f("contact")} value={org.contact_person} placeholder="–" onSave={(v) => onUpdate({ contact_person: v })} />
        </PropRow>
        <PropRow label="E-Mail / Tel." htmlFor={f("info")}>
          <EditText id={f("info")} value={org.contact_info} placeholder="–" onSave={(v) => onUpdate({ contact_info: v })} />
        </PropRow>
        <PropRow label="Website" htmlFor={f("url")}>
          <EditText id={f("url")} value={org.url} placeholder="–" onSave={(v) => onUpdate({ url: v })} />
        </PropRow>
        {org.stage === "abgesagt" && (
          <PropRow label="Grund" htmlFor={f("lost")}>
            <EditText id={f("lost")} value={org.lost_reason} placeholder="–" onSave={(v) => onUpdate({ lost_reason: v })} />
          </PropRow>
        )}
      </div>

      {/* Venue: Eckdaten für den Vergleich */}
      {isVenue && (
        <div className="flex flex-col border-b border-line px-[18px] py-2.5">
          <h3 className="label-mono pt-1 pb-1.5">Eckdaten</h3>
          <PropRow label="Kapazität" htmlFor={f("cap")}>
            <EditText id={f("cap")} value={org.capacity} placeholder="–" onSave={(v) => onUpdate({ capacity: v })} />
          </PropRow>
          <PropRow label="Übernachtung" htmlFor={f("night")}>
            <EditText id={f("night")} value={org.overnight} placeholder="–" onSave={(v) => onUpdate({ overnight: v })} />
          </PropRow>
          <PropRow label="Preis / Deal" htmlFor={f("price")}>
            <EditText id={f("price")} value={org.price} placeholder="–" onSave={(v) => onUpdate({ price: v })} />
          </PropRow>
          <PropRow label="Lage" htmlFor={f("loc")}>
            <EditText id={f("loc")} value={org.location} placeholder="–" onSave={(v) => onUpdate({ location: v })} />
          </PropRow>
        </div>
      )}

      <div className="flex flex-col border-b border-line px-[18px] py-2.5">
        <div className="flex flex-col gap-1 py-1.5">
          <label htmlFor={f("notes")} className="text-[13px] text-fg-3">
            Notizen
          </label>
          <EditText id={f("notes")} value={org.notes} placeholder="–" onSave={(v) => onUpdate({ notes: v })} multiline />
        </div>
      </div>

      {/* Calls und Meetings mit der Firma */}
      <div className="border-b border-line px-[18px] py-3.5">
        <MeetingBlock variant="plain" organization_id={org.id} match={(m) => m.organization_id === org.id} />
      </div>

      {/* Unterlagen zur Firma (Deck, Vertrag, Call-Transkript …) */}
      <div className="border-b border-line px-[18px] py-3.5">
        <DocBlock
          variant="plain"
          defaults={{ target_type: "organization", target_id: org.id }}
          match={(d) => d.target_type === "organization" && d.target_id === org.id}
        />
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
                  ? `hat die Firma aus ${String(a.data.source ?? "der Excel").replace(/ Z\. \d+.*$/, "")} übernommen`
                  : a.action === "meeting_linked"
                    ? `hat den Termin „${String(a.data.title ?? "")}“ am ${formatShort(todayInVienna(new Date(String(a.data.starts_at))))} eingetragen`
                    : a.action
          }
        />
      </div>
    </div>
  );
}
