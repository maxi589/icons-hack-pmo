// Direktlinks auf einen Eintrag (für Inbox und „Link kopieren“ → WhatsApp).

export type TargetType = "organization" | "task" | "milestone" | "decision";

export function targetHref(type: TargetType, id: string) {
  switch (type) {
    case "organization":
      return `/pipeline?firma=${id}`;
    case "task":
      return `/aufgaben?aufgabe=${id}`;
    case "milestone":
      return `/roadmap?m=${id}`;
    case "decision":
      return `/wissen?entscheidung=${id}`;
  }
}

export const TARGET_NAMES: Record<TargetType, string> = {
  organization: "Firma",
  task: "Aufgabe",
  milestone: "Meilenstein",
  decision: "Entscheidung",
};
