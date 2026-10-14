import type { Person } from "@/components/app-shell/team-provider";

// Initialen-Kreis in der Personenfarbe (Initialen --avatarInk, Farben --avatar-<initialen> in globals.css).
// Ohne Person: gestrichelter Kreis = „noch niemand zuständig“.
export function Avatar({ person, size = 26, title }: { person: Person | null; size?: number; title?: string }) {
  if (!person) {
    return (
      <span
        className="inline-block shrink-0 rounded-full border border-dashed border-line-2"
        style={{ width: size, height: size }}
        title={title ?? "Noch niemand zuständig"}
        aria-hidden
      />
    );
  }
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-full font-semibold text-[var(--avatarInk)]"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4), background: person.color }}
      title={title ?? person.name}
      aria-hidden
    >
      {person.initials}
    </span>
  );
}
