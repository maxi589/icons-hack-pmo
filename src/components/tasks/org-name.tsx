import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Firma einer Aufgabe in Zeilen und Karten: kleines Gebäude-Symbol + Name (Aufgaben, Für mich, Bereichs-Seite).
// Standard-Aufgaben heißen bei jeder Firma gleich („Vereinbarung schicken“), erst die Firma macht sie eindeutig.
export function OrgName({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1 text-[12px] font-medium text-fg-2", className)} title={name}>
      <Building2 className="size-3 shrink-0 text-fg-3" aria-hidden />
      <span className="sr-only">Firma </span>
      <span className="max-w-[180px] truncate">{name}</span>
    </span>
  );
}
