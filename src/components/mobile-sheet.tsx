"use client";

import { useRef } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

// Detail am Handy als Bottom Sheet (Firma, Aufgabe, Entscheidung). Am Desktop steht das Detail rechts neben der Liste.
// Startfokus auf „Detail schließen“ statt auf dem ersten Eingabefeld: sonst springt am iPhone sofort die Tastatur auf.
export function MobileSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const popup = useRef<HTMLDivElement>(null);
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        ref={popup}
        data-detail
        initialFocus={() => popup.current?.querySelector<HTMLElement>('[aria-label="Detail schließen"]') ?? true}
        side="bottom"
        showCloseButton={false}
        className="max-h-[92dvh] gap-0 overflow-y-auto pb-[env(safe-area-inset-bottom)]"
      >
        <SheetTitle className="sr-only">{title}</SheetTitle>
        <div className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-line-2" aria-hidden />
        {children}
      </SheetContent>
    </Sheet>
  );
}
