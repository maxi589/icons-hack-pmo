"use client";

import { useEffect, useRef } from "react";

// Punktraster hinter dem Countdown (Maxi, 14.10.): eine weiche Welle zieht langsam durch (≈ 11 s), unter dem
// Mauszeiger heben sich die Punkte leicht an. Farbe = --accLine (hell/dunkel automatisch). Canvas 2D, 30 Bilder/s,
// pausiert außerhalb des Bildes und bei verstecktem Tab. Bei „Bewegung reduzieren“ ein ruhiges Standbild.
// Das Elternelement braucht `relative isolate overflow-hidden`.
export function RasterField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let visible = true;
    let mx: number | null = null;
    let my: number | null = null;
    let raf = 0;
    let last = 0;

    const rgb = () => {
      const hex = getComputedStyle(cv).getPropertyValue("--accLine").trim().replace("#", "");
      const n = parseInt(hex.length === 3 ? hex.replace(/./g, "$&$&") : hex, 16);
      return [n >> 16, (n >> 8) & 255, n & 255].join(",");
    };

    const draw = (t: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = cv.clientWidth;
      const h = cv.clientHeight;
      if (!w || !h) return;
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
        cv.width = Math.round(w * dpr);
        cv.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const color = rgb();
      const gap = 13;
      for (let y = gap / 2; y < h; y += gap) {
        for (let x = gap / 2; x < w; x += gap) {
          const wave = Math.max(0, Math.sin((x * 0.82 + y * 0.57) / 70 - t * 0.55));
          let a = 0.08 + 0.14 * wave ** 2.2;
          let r = 0.85 + 0.5 * wave ** 3;
          if (mx !== null && my !== null) {
            const d = Math.hypot(x - mx, y - my);
            const k = Math.exp(-(d * d) / 3600);
            a += 0.28 * k;
            r += 0.8 * k;
          }
          ctx.fillStyle = `rgba(${color},${Math.min(a, 0.5)})`;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, 6.283);
          ctx.fill();
        }
      }
    };

    const loop = (now: number) => {
      if (visible && !document.hidden && now - last > 33) {
        last = now;
        draw(now / 1000);
      }
      raf = requestAnimationFrame(loop);
    };

    const host = cv.parentElement!;
    const move = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      mx = e.clientX - r.left;
      my = e.clientY - r.top;
    };
    const leave = () => {
      mx = my = null;
    };
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(cv);

    if (reduce) {
      draw(1.2);
      // Theme-Wechsel neu zeichnen (Farbe hängt an .dark)
      const mo = new MutationObserver(() => draw(1.2));
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      return () => {
        io.disconnect();
        mo.disconnect();
      };
    }
    host.addEventListener("pointermove", move);
    host.addEventListener("pointerleave", leave);
    draw(performance.now() / 1000); // sofort ein Bild, auch wenn der Tab gerade im Hintergrund ist
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerleave", leave);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 -z-10 size-full" />;
}
