"use client";

import { useSwipe } from "@/lib/use-swipe";

/** Bereich, in dem Wischen blättert (seitlich: Woche, senkrecht: Monat). */
export function SwipeArea({
  axis,
  onPrev,
  onNext,
  className,
  children,
}: {
  axis: "x" | "y";
  onPrev: () => void;
  onNext: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useSwipe<HTMLDivElement>({ axis, onPrev, onNext });
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
