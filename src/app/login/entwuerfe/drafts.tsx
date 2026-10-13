"use client";

import { Suspense, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { CharFieldBackground, CodeLogBackground, DotGridBackground } from "@/components/login-backgrounds";
import { LoginCard } from "../login-card";
import { cn } from "@/lib/utils";

// Vorübergehend: drei Hintergründe für die Login-Seite zum Vergleichen. Nach der Entscheidung löschen.
const VARIANTS = [
  { id: "log", label: "1 · Code-Log", Bg: CodeLogBackground },
  { id: "dots", label: "2 · Punktraster", Bg: DotGridBackground },
  { id: "chars", label: "3 · Zeichenfeld", Bg: CharFieldBackground },
] as const;
type VariantId = (typeof VARIANTS)[number]["id"];

export function Drafts() {
  const [v, setV] = useState<VariantId>("log");
  const { Bg } = VARIANTS.find((x) => x.id === v)!;

  return (
    <div className="relative flex min-h-dvh flex-1 overflow-hidden bg-bg">
      <Bg key={v} />

      <div className="fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3">
        <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-card p-1 shadow-card">
          {VARIANTS.map((x) => (
            <button
              key={x.id}
              type="button"
              onClick={() => setV(x.id)}
              aria-pressed={v === x.id}
              className={cn(
                "shrink-0 rounded-lg px-3 py-1.5 text-[13px] text-fg-2 transition-colors duration-150 hover:bg-hover hover:text-fg",
                v === x.id && "bg-active font-medium text-fg"
              )}
            >
              {x.label}
            </button>
          ))}
          <span className="mx-1 h-5 w-px shrink-0 bg-line-2" aria-hidden />
          <ThemeToggle className="shrink-0" />
        </div>
      </div>

      <div className="relative z-10 flex flex-1 items-end justify-center px-4 pt-20 pb-8 lg:items-center lg:justify-end lg:pr-[12vw]">
        <Suspense>
          <LoginCard />
        </Suspense>
      </div>
    </div>
  );
}
