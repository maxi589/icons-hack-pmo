"use client";

import { useEffect, useRef } from "react";

// Wischen wie im Kalender (8.11.): seitlich = Woche vor/zurück, senkrecht = Monat vor/zurück.
// Erkennt Finger (Handy, Touchscreen) und das Wischen mit zwei Fingern auf dem Trackpad (kommt als Mausrad-Ereignis).
// Ein Wisch löst genau einen Wechsel aus: Das Nachlaufen des Trackpads zählt erst wieder nach einer kurzen Pause.

type Options = {
  axis: "x" | "y";
  /** zurück: nach rechts bzw. nach unten gewischt (Inhalt kommt von links bzw. oben) */
  onPrev: () => void;
  onNext: () => void;
  enabled?: boolean;
};

const TOUCH_MIN = 50; // px Fingerweg
const WHEEL_MIN = 60; // gesammelte Rad-Einheiten je Wisch
const WHEEL_PAUSE = 220; // ms ohne Rad-Ereignis = neuer Wisch

export function useSwipe<T extends HTMLElement>({ axis, onPrev, onNext, enabled = true }: Options) {
  const ref = useRef<T>(null);
  const cb = useRef({ onPrev, onNext });
  useEffect(() => {
    cb.current = { onPrev, onNext };
  });

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    let start: { x: number; y: number } | null = null;
    let sum = 0;
    let fired = false;
    let lastWheel = 0;

    const onTouchStart = (e: TouchEvent) => {
      start = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const s = start;
      start = null;
      if (!s) return;
      const dx = e.changedTouches[0].clientX - s.x;
      const dy = e.changedTouches[0].clientY - s.y;
      const [main, cross] = axis === "x" ? [dx, dy] : [dy, dx];
      if (Math.abs(main) > TOUCH_MIN && Math.abs(main) > Math.abs(cross) * 1.5) (main < 0 ? cb.current.onNext : cb.current.onPrev)();
    };
    const onWheel = (e: WheelEvent) => {
      // Mit Strg = Zoomen (Trackpad-Kneifen), nicht anfassen
      if (e.ctrlKey) return;
      const main = axis === "x" ? e.deltaX : e.deltaY;
      const cross = axis === "x" ? e.deltaY : e.deltaX;
      if (Math.abs(main) <= Math.abs(cross)) return;
      // Seitliches Wischen: sonst blättert der Browser eine Seite zurück. Senkrecht: die Monatsansicht scrollt nicht.
      e.preventDefault();
      const now = e.timeStamp;
      if (now - lastWheel > WHEEL_PAUSE) {
        sum = 0;
        fired = false;
      }
      lastWheel = now;
      if (fired) return;
      // Mausrad mit Zeilen statt Pixeln (Firefox) etwa in Pixel umrechnen
      sum += main * (e.deltaMode === 1 ? 33 : 1);
      if (Math.abs(sum) >= WHEEL_MIN) {
        fired = true;
        (sum > 0 ? cb.current.onNext : cb.current.onPrev)();
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("wheel", onWheel);
    };
  }, [axis, enabled]);

  return ref;
}
