// Direktlinks auf einen Eintrag (für Inbox und „Link kopieren“ → WhatsApp).

export type TargetType = "organization" | "task" | "milestone" | "decision" | "document" | "meeting" | "feedback" | "area";

export function targetHref(type: TargetType, id: string) {
  switch (type) {
    case "organization":
      return `/pipeline?firma=${id}`;
    case "task":
      return `/aufgaben?aufgabe=${id}`;
    case "milestone":
      return `/roadmap?m=${id}`;
    case "decision":
      return `/dokumente?entscheidung=${id}`;
    case "document":
      return `/dokumente?dok=${id}`;
    case "meeting":
      return `/termine?termin=${id}`;
    case "feedback":
      return `/inbox?feedback=${id}`;
    case "area":
      return `/bereiche/${id}`;
  }
}

export const TARGET_NAMES: Record<TargetType, string> = {
  organization: "Firma",
  task: "Aufgabe",
  milestone: "Meilenstein",
  decision: "Entscheidung",
  document: "Dokument",
  meeting: "Termin",
  feedback: "Feedback",
  area: "Bereich",
};
