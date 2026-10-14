"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Zeichen eines Bereichs: Kern in Bereichsfarbe, darum ein feiner Ring, der den Fortschritt zeigt
// (erledigte Meilensteine). Der Bogen zeichnet sich beim Erscheinen und bei jeder Änderung (300 ms).
// Hover über dem umgebenden Link (`group`) hebt das Zeichen leicht an.
export function AreaGlyph({ color, progress, size = 14, active = false }: { color: string; progress: number; size?: number; active?: boolean }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(progress));
    return () => cancelAnimationFrame(id);
  }, [progress]);

  const stroke = size >= 20 ? 2.5 : 2.25;
  const r = 12 - stroke;
  const c = 2 * Math.PI * r;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className="shrink-0 -rotate-90 transition-transform duration-200 ease-out group-hover:scale-115 motion-reduce:transition-none"
      aria-hidden
    >
      <circle cx="12" cy="12" r={r} fill="none" stroke={color} strokeOpacity={0.4} strokeWidth={stroke} />
      <circle
        cx="12"
        cy="12"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.min(1, Math.max(0, shown)))}
        className="transition-[stroke-dashoffset] duration-300 ease-out motion-reduce:transition-none"
        opacity={shown > 0 ? 1 : 0}
      />
      <circle cx="12" cy="12" r={active ? 5.5 : 4} fill={color} className={cn("transition-[r] duration-200 ease-out", "group-hover:[r:5.5px]")} />
    </svg>
  );
}
