"use client";

import { Plus } from "lucide-react";
import { Kbd } from "@/components/ui/command";
import { usePalette } from "./command-palette";

// Kopfleiste im Hauptpanel (nur Desktop): Seitentitel links, „Befehle“ und „Neu“ rechts.
// `children` sind zusätzliche Knöpfe der Seite (z. B. Board/Liste in der Pipeline).
// `action` ersetzt „Neu“ durch eine seiteneigene Hauptaktion (z. B. „+ Firma“).

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
          onClick={() => open()}
          className="inline-flex h-8 items-center gap-2 rounded-[9px] px-3 text-[13px] font-medium text-fg-2 shadow-[inset_0_0_0_1px_var(--line2)] transition-[background,color,scale] duration-150 hover:bg-hover hover:text-fg active:scale-[.97]"
        >
          Befehle <Kbd>Strg K</Kbd>
        </button>
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
