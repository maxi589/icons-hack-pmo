"use client";

import { useEffect, useRef } from "react";

// Hintergrund der Login-Seite: tiefschwarz, oben ein leichter Kobalt-Schimmer (#4f8fd9),
// und ein weicher Kobalt-Schein, der dem Mauszeiger folgt (nur mit Maus, nicht am Handy).
// Bewusste Ausnahme vom „kein Glow“ im Design-System, nur auf dieser Seite (Maxi, 13.10.).
export function LoginBackdrop() {
  const spot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = spot.current;
    if (!el || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let raf = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--x", `${e.clientX}px`);
        el.style.setProperty("--y", `${e.clientY}px`);
        el.style.opacity = "1";
      });
    };
    const leave = () => {
      el.style.opacity = "0";
    };
    window.addEventListener("pointermove", move);
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      {/* Schimmer oben in der Mitte, atmet langsam */}
      <div
        className="login-shimmer absolute -top-[30vh] left-1/2 h-[70vh] w-[110vw] max-w-[1400px] -translate-x-1/2"
        style={{
          background:
            "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(79,143,217,0.18), rgba(79,143,217,0.06) 45%, transparent 72%)",
        }}
      />
      {/* Schein unter dem Mauszeiger */}
      <div
        ref={spot}
        className="absolute inset-0 opacity-0 transition-opacity duration-300 ease-out"
        style={{
          background:
            "radial-gradient(420px circle at var(--x, 50%) var(--y, 50%), rgba(79,143,217,0.06), transparent 65%)",
        }}
      />
    </div>
  );
}
