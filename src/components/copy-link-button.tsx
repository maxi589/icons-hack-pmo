"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Direktlink kopieren (für WhatsApp), bewusst unauffällig: nur ein Icon in der Ecke, wie „Schließen“.
// `path` ist der Pfad ohne Origin, z. B. „/pipeline?firma=…“.
export function CopyLinkButton({ path, label, className }: { path: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(window.location.origin + path);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={copy}
      title="Link kopieren"
      aria-label={label}
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-lg text-fg-3 transition-colors duration-150 hover:bg-hover hover:text-fg max-md:size-11",
        className
      )}
    >
      {copied ? <Check className="size-4 text-st-green" aria-hidden /> : <Link2 className="size-4" aria-hidden />}
      <span className="sr-only" aria-live="polite">
        {copied ? "Link kopiert" : ""}
      </span>
    </button>
  );
}
