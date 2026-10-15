"use client";

import { Plus } from "lucide-react";
import { usePalette } from "./command-palette";

// Kopfleiste im Hauptpanel (nur Desktop): Seitentitel links, „Neu“ rechts.
// `children` sind zusätzliche Knöpfe der Seite (z. B. Board/Liste in der Pipeline).
// `action` ersetzt „Neu“ durch eine seiteneigene Hauptaktion (z. B. „+ Firma“).

/**
 * Seitentitel am Handy (15.10.): Titel links, die Hauptaktion der Seite rechts in derselben Zeile.
 * So steht „+ Termin“, „+ Aufgabe“ usw. überall an derselben Stelle und spart eine Zeile über dem Inhalt.
 */
export function MobileTitle({
  title,
  action,
  children,
}: {
  title: React.ReactNode;
  action?: { label: string; onClick: () => void };
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-12 items-center gap-2 px-3.5 pb-1 md:hidden">
      <h1 className="flex min-w-0 flex-1 items-center gap-2 text-[20px] font-semibold tracking-[-0.025em]">{title}</h1>
      {children}
      {action && (
        // Fläche 36px hoch, Tippfläche per ::after auf 44px erweitert
        <button
          type="button"
          onClick={action.onClick}
          className="relative inline-flex h-9 shrink-0 items-center gap-1 rounded-[9px] pr-3 pl-2.5 text-[13.5px] font-medium text-acc-text transition-[scale] duration-150 after:absolute after:inset-x-0 after:-inset-y-1 active:scale-[.97] bg-acc"
        >
          <Plus className="size-[15px]" strokeWidth={2.4} aria-hidden />
          {action.label}
        </button>
      )}
    </div>
  );
}

export function PageHeader({
  title,
  children,
  action,
}: {
  title: string;
  children?: React.ReactNode;
  action?: { label: string; onClick: () => void };
}) {
  const { open } = usePalette();
  return (
    <div className="hidden flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3 md:flex">
      <div className="text-[13.5px] text-fg-2">{title}</div>
      <div className="flex items-center gap-2">
        {children}
        <button
          type="button"
          onClick={action ? action.onClick : () => open("new")}
          className="inline-flex h-8 items-center gap-2 rounded-[9px] bg-acc px-3 text-[13px] font-medium text-acc-text transition-[scale] duration-150 active:scale-[.97]"
        >
          <Plus className="size-3.5" strokeWidth={2.2} aria-hidden />
          {action ? action.label : "Neu"}
        </button>
      </div>
    </div>
  );
}
