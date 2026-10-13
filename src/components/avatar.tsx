import type { Person } from "@/components/app-shell/team-provider";

// Initialen-Kreis in der Personenfarbe (Initialen #111, Design-System Abschnitt 2).
// Ohne Person: gestrichelter Kreis = „noch niemand zuständig“.
export function Avatar({ person, size = 26, title }: { person: Person | null; size?: number; title?: string }) {
  if (!person) {
    return (
      <span
        className="shrink-0 rounded-full border border-dashed border-line-2"
        style={{ width: size, height: size }}
        title={title ?? "Noch niemand zuständig"}
        aria-hidden
      />
    );
  }
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-semibold text-[#111]"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4), background: person.color }}
      title={title ?? person.name}
      aria-hidden
    >
      {person.initials}
    </span>
  );
}
