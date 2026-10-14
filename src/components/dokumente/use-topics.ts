"use client";

import { useMemo } from "react";
import type { Topic } from "@/components/wissen/pickers";
import type { Milestone } from "@/lib/data/use-milestones";
import type { Organization } from "@/lib/pipeline";
import { milestoneOptions, type Task } from "@/lib/tasks";
import { viennaParts, type Meeting } from "@/lib/meetings";
import { formatShort } from "@/lib/dates";

// Auswahl „gehört zu“: Meilensteine, Firmen der Pipeline, offene Aufgaben, Termine (wie bei Entscheidungen).

export function useTopics(milestones: Milestone[] | null, orgs: Organization[] | null, tasks: Task[] | null, meetings?: Meeting[] | null | false): Topic[] {
  return useMemo(
    () => [
      ...milestoneOptions(milestones ?? []).map((m) => ({ type: "milestone" as const, id: m.id, label: `${m.parent_id ? "   " : ""}${m.id} · ${m.title}` })),
      ...[...(orgs ?? [])].sort((a, b) => a.name.localeCompare(b.name, "de")).map((o) => ({ type: "organization" as const, id: o.id, label: o.name })),
      ...(tasks ?? []).filter((t) => t.status !== "erledigt").map((t) => ({ type: "task" as const, id: t.id, label: t.title })),
      ...[...(meetings || [])].reverse().map((m) => ({ type: "meeting" as const, id: m.id, label: `${formatShort(viennaParts(m.starts_at).date)} · ${m.title}` })),
    ],
    [milestones, orgs, tasks, meetings]
  );
}
