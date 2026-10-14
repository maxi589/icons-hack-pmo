"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Chip } from "@/components/chip";
import { useToast } from "@/components/toast";
import { useTeam } from "@/components/app-shell/team-provider";
import { useInbox } from "@/components/app-shell/inbox-provider";
import { createClient } from "@/lib/supabase/client";
import { logActivity } from "@/lib/data/use-feed";
import { formatShort } from "@/lib/dates";
import { shiftFollowUp, TABS } from "@/lib/pipeline";
import { targetHref } from "@/lib/links";
import { play } from "@/lib/sounds";
import type { Org, Task } from "./use-overview-data";

// „Heute für dich“ (Board „Graphit-Handy“), nur am Handy: was die angemeldete Person heute erledigen sollte.
// - eigene Aufgaben, fällig heute oder überfällig → Abhaken = erledigt
// - eigene Firmen mit Nachfassen heute oder überfällig → Abhaken = nachgefasst, nächster Termin automatisch in 7 Tagen (Maxi, 13.10.), „+2 T“ verschiebt
// - ungelesene Erwähnungen → Abhaken = gelesen
// Abgehakte Zeilen bleiben bis zum Neuladen durchgestrichen stehen und lassen sich wieder aufheben.

type Item = {
  key: string;
  kind: "task" | "follow" | "mention";
  id: string;
  title: string;
  href: string;
  late: boolean;
  meta: string;
  /** vorheriger Nachfass-Termin bzw. Frist, für Rückgängig */
  date: string | null;
};

export function TodayCard({ tasks, orgs, today }: { tasks: Task[]; orgs: Org[]; today: string }) {
  const { me, personById, areaById } = useTeam();
  const { items: inbox, setRead } = useInbox();
  const toast = useToast();
  // Abgehakte Zeilen (für die Anzeige) und ihr Protokoll-Stand (nur für Rückgängig/Verlauf, nicht beim Rendern gelesen)
  const [checked, setChecked] = useState<Record<string, Item>>({});
  const entries = useRef(new Map<string, { logged: boolean }>());

  if (!me) return null;

  const live: Item[] = [
    ...tasks
      .filter((t) => t.assignee_id === me.id && t.due_date! <= today)
      .map((t) => ({
        key: `task:${t.id}`,
        kind: "task" as const,
        id: t.id,
        title: t.title,
        href: targetHref("task", t.id),
        late: t.due_date! < today,
        meta: [t.milestone_id, areaById(t.area_id)?.name].filter(Boolean).join(" · "),
        date: t.due_date,
      })),
    ...orgs
      .filter((o) => o.owner_id === me.id && o.next_follow_up && o.next_follow_up <= today && o.stage !== "fix" && o.stage !== "abgesagt")
      .map((o) => ({
        key: `follow:${o.id}`,
        kind: "follow" as const,
        id: o.id,
        title: `${o.name} nachfassen`,
        href: targetHref("organization", o.id),
        late: o.next_follow_up! < today,
        meta: [TABS.find((t) => o.roles.some((r) => t.roles.includes(r)))?.name, o.wave && `Welle ${o.wave}`].filter(Boolean).join(" · "),
        date: o.next_follow_up,
      })),
    ...(inbox ?? [])
      .filter((n) => n.kind === "mention" && !n.read_at && n.targetName)
      .map((n) => ({
        key: `mention:${n.id}`,
        kind: "mention" as const,
        id: n.id,
        title: `${personById(n.actor_id)?.name ?? "Jemand"} antworten`,
        href: n.href,
        late: false,
        meta: n.targetName!,
        date: null,
      })),
  ];
  // Abgehakte bleiben sichtbar (die Live-Daten enthalten sie nicht mehr).
  const rows = [...live.filter((i) => !checked[i.key]), ...Object.values(checked)];
  const order = (i: Item) => (i.kind === "mention" ? 2 : i.late ? 0 : 1);
  rows.sort((a, b) => order(a) - order(b) || a.title.localeCompare(b.title, "de"));
  const open = rows.filter((i) => !checked[i.key]).length;

  const supabase = createClient();

  const apply = async (i: Item, done: boolean) => {
    if (i.kind === "task") {
      await supabase
        .from("tasks")
        .update({ status: done ? "erledigt" : "offen", done_at: done ? new Date().toISOString() : null })
        .eq("id", i.id);
    } else if (i.kind === "follow") {
      await supabase.from("organizations").update({ next_follow_up: done ? shiftFollowUp(null, today, 7) : i.date }).eq("id", i.id);
    } else {
      await setRead([i.id], done);
    }
  };

  const log = (i: Item, done: boolean) => {
    if (i.kind === "task") logActivity("task", i.id, me.id, "status_changed", done ? { from: "offen", to: "erledigt" } : { from: "erledigt", to: "offen" });
    if (i.kind === "follow" && done) logActivity("organization", i.id, me.id, "followed_up", { date: i.date, next: shiftFollowUp(null, today, 7) });
  };

  const check = (i: Item) => {
    const entry = { logged: false };
    entries.current.set(i.key, entry);
    setChecked((c) => ({ ...c, [i.key]: i }));
    apply(i, true);
    play("taskDone");
    if (i.kind === "mention") return;
    toast({
      text: i.kind === "task" ? `„${i.title}“ erledigt` : `${i.title.replace(/ nachfassen$/, "")} nachgefasst · wieder am ${formatShort(shiftFollowUp(null, today, 7))}`,
      onAction: () => uncheck(i),
      onExpire: () => {
        if (entries.current.get(i.key) !== entry) return;
        log(i, true);
        entry.logged = true;
      },
    });
  };

  const uncheck = (i: Item) => {
    const entry = entries.current.get(i.key);
    entries.current.delete(i.key);
    setChecked((c) => {
      const next = { ...c };
      delete next[i.key];
      return next;
    });
    apply(i, false);
    if (entry?.logged) log(i, false);
  };

  const snooze = async (i: Item) => {
    const to = shiftFollowUp(i.date, today, 2);
    await supabase.from("organizations").update({ next_follow_up: to }).eq("id", i.id);
    toast({
      text: `${i.title.replace(/ nachfassen$/, "")} auf ${formatShort(to)} verschoben`,
      onAction: () => supabase.from("organizations").update({ next_follow_up: i.date }).eq("id", i.id),
    });
  };

  return (
    <section className="w-full overflow-hidden rounded-[18px] bg-card shadow-card md:hidden" aria-labelledby="today-title">
      <div className="flex items-center justify-between px-3.5 pt-3.5 pb-2.5">
        <h2 id="today-title" className="text-[15px] font-semibold">
          Heute für dich
        </h2>
        <span className="text-[12.5px] text-fg-3 tabular">{open} offen</span>
      </div>
      {rows.length === 0 ? (
        <p className="border-t border-line px-3.5 py-5 text-[14px] text-fg-2">Für heute ist nichts offen.</p>
      ) : (
        <ul>
          {rows.map((i) => {
            const done = !!checked[i.key];
            return (
              <li key={i.key} className="relative flex min-h-[60px] items-center gap-3 border-t border-line px-3.5 py-2.5">
                <button
                  type="button"
                  onClick={() => (done ? uncheck(i) : check(i))}
                  aria-pressed={done}
                  aria-label={done ? `„${i.title}“ wieder öffnen` : i.kind === "mention" ? `„${i.title}“ als gelesen markieren` : `„${i.title}“ als erledigt markieren`}
                  className={cn(
                    "relative z-[1] grid size-[26px] shrink-0 place-items-center rounded-full transition-[background,box-shadow,scale] duration-150 active:scale-90",
                    "before:absolute before:-inset-[9px] before:content-['']",
                    done ? "bg-st-green text-card" : "shadow-[inset_0_0_0_1.5px_var(--field)]"
                  )}
                >
                  {done && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
                </button>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <Link href={i.href} className={cn("line-clamp-2 rounded-sm text-[15px] leading-snug after:absolute after:inset-0", done && "text-fg-3 line-through")}>
                    {i.title}
                  </Link>
                  <span className="flex min-w-0 items-center gap-1.5">
                    {i.kind === "mention" ? (
                      <Chip>Erwähnung</Chip>
                    ) : (
                      <Chip tone={i.late ? "red" : "today"}>
                        {i.late ? "überfällig" : "heute"}
                      </Chip>
                    )}
                    {i.meta && <span className="truncate text-[12px] text-fg-3">{i.meta}</span>}
                  </span>
                </span>
                {i.kind === "follow" && !done && (
                  <button
                    type="button"
                    onClick={() => snooze(i)}
                    className="relative z-[1] inline-flex h-11 shrink-0 items-center rounded-[9px] px-3 text-[13px] text-fg-2 shadow-[inset_0_0_0_1px_var(--line2)]"
                    aria-label={`${i.title.replace(/ nachfassen$/, "")}: Nachfassen um 2 Tage verschieben`}
                  >
                    +2 T
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
