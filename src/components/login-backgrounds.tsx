"use client";

import { useEffect, useRef } from "react";
import { daysUntil, EVENT_START } from "@/lib/dates";
import milestoneData from "../../docs/daten/meilensteine.json";

// Drei Hintergründe für die Login-Seite, alle als <canvas>, ruhig und ohne Glow.
// Farben kommen aus den Design-Tokens und wechseln mit Hell/Dunkel.
// Bei „Bewegung reduzieren“ wird nur ein stehendes Bild gezeichnet.

type Colors = { text3: string; line2: string; acc: string; bg: string; mono: string };

function readColors(): Colors {
  const s = getComputedStyle(document.documentElement);
  return {
    text3: s.getPropertyValue("--text3").trim(),
    line2: s.getPropertyValue("--line2").trim(),
    acc: s.getPropertyValue("--accLine").trim(),
    bg: s.getPropertyValue("--bg").trim(),
    // Canvas versteht keine CSS-Variablen in font, deshalb den echten Schriftnamen holen
    mono: s.getPropertyValue("--font-geist-mono").trim() || "ui-monospace, monospace",
  };
}

type Frame = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number, c: Colors) => void;

function useCanvas(draw: Frame, fps = 30) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let colors = readColors();
    let w = 0;
    let h = 0;
    let raf = 0;
    let last = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(ctx, w, h, performance.now(), colors);
    };
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < 1000 / fps) return;
      last = now;
      draw(ctx, w, h, now, colors);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    // Hell/Dunkel-Wechsel: Klasse auf <html> beobachten
    const mo = new MutationObserver(() => {
      colors = readColors();
      draw(ctx, w, h, performance.now(), colors);
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    document.fonts.ready.then(resize);
    if (!reduce) raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
    };
  }, [draw, fps]);
  return ref;
}

const canvasClass = "pointer-events-none absolute inset-0 size-full";

// ---------------------------------------------------------------
// 1 · Code-Log: Spalten mit echten Projektzeilen laufen langsam nach oben
// ---------------------------------------------------------------
const LOG_LINES: string[] = (() => {
  const ms = milestoneData.meilensteine.map((m) => {
    const [, mo, d] = m.deadline.split("-");
    return `${m.id.padEnd(5)} ${d}.${mo}.  ${m.titel.toLowerCase()}`;
  });
  return [
    "$ icons status",
    `[ok] ${milestoneData.meilensteine.length} meilensteine geladen`,
    "[ok] pipeline: 93 firmen · 21 venues",
    "[..] welle 1 startet mo 19.10.",
    "[..] nachfassen 02.11. · 16.11. · 30.11.",
    `[..] kickoff in ${daysUntil(EVENT_START)} tagen`,
    "team: MS MD MA TI KI",
    "ziel: 4 challenge-partner · 4 jury · 1 venue",
    ...ms,
    "git commit -m 'outreach welle 1'",
    "sync realtime ✓",
  ];
})();

const drawCodeLog: Frame = (ctx, w, h, t, c) => {
  ctx.clearRect(0, 0, w, h);
  const colW = 360;
  const maxChars = 38; // Zeilen kürzen, damit sich die Spalten nicht überlappen
  const lineH = 20;
  const cols = Math.ceil(w / colW) + 1;
  ctx.font = `12px ${c.mono}`;
  ctx.textBaseline = "top";
  for (let col = 0; col < cols; col++) {
    const speed = 9 + ((col * 7) % 5) * 3; // px pro Sekunde
    const offset = ((t / 1000) * speed + col * 137) % (LOG_LINES.length * lineH);
    const x = col * colW + 24;
    for (let i = -1; i < h / lineH + 2; i++) {
      const y = i * lineH - (offset % lineH);
      const idx = (Math.floor(offset / lineH) + i + col * 5 + LOG_LINES.length * 10) % LOG_LINES.length;
      const raw = LOG_LINES[idx];
      const line = raw.length > maxChars ? raw.slice(0, maxChars - 1) + "…" : raw;
      const hot = (idx + col) % 17 === 0;
      ctx.globalAlpha = hot ? 0.6 : 0.22;
      ctx.fillStyle = hot ? c.acc : c.text3;
      ctx.fillText(line, x, y);
    }
  }
  ctx.globalAlpha = 1;
};

export function CodeLogBackground() {
  const ref = useCanvas(drawCodeLog, 30);
  return (
    <canvas
      ref={ref}
      aria-hidden
      className={canvasClass}
      style={{ maskImage: "linear-gradient(to bottom, transparent, black 18%, black 82%, transparent)" }}
    />
  );
}

// ---------------------------------------------------------------
// 2 · Punktraster: Punkte reagieren auf die Maus, sonst läuft eine ruhige Welle
// ---------------------------------------------------------------
const pointer = { x: -9999, y: -9999 };

const drawDots: Frame = (ctx, w, h, t, c) => {
  ctx.clearRect(0, 0, w, h);
  const gap = 22;
  const radius = 150;
  for (let y = gap / 2; y < h; y += gap) {
    for (let x = gap / 2; x < w; x += gap) {
      const wave = Math.sin(x * 0.012 + y * 0.008 - t / 1400);
      const d = Math.hypot(x - pointer.x, y - pointer.y);
      const near = Math.max(0, 1 - d / radius);
      const r = 0.9 + Math.max(0, wave) * 0.45 + near * 1.6;
      ctx.globalAlpha = near > 0 ? 0.35 + near * 0.6 : 0.55 + wave * 0.2;
      ctx.fillStyle = near > 0.15 ? c.acc : c.text3;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
};

export function DotGridBackground() {
  const ref = useCanvas(drawDots, 40);
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
    };
    const leave = () => {
      pointer.x = pointer.y = -9999;
    };
    window.addEventListener("pointermove", move);
    document.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
    };
  }, [ref]);
  return <canvas ref={ref} aria-hidden className={canvasClass} />;
}

// ---------------------------------------------------------------
// 3 · Zeichenfeld: flackernde Zeichen, aus denen die Countdown-Zahl hervortritt
// ---------------------------------------------------------------
const CHARS = "0123456789abcdef{}[]<>/=+*#$%&;:";
const field: { cols: number; rows: number; cells: string[]; mask: Uint8Array; key: string } = {
  cols: 0,
  rows: 0,
  cells: [],
  mask: new Uint8Array(0),
  key: "",
};

function buildMask(cols: number, rows: number, cellW: number, cellH: number, w: number, h: number) {
  const off = document.createElement("canvas");
  off.width = cols;
  off.height = rows;
  const o = off.getContext("2d", { willReadFrequently: true })!;
  const family = getComputedStyle(document.documentElement).getPropertyValue("--font-michroma").trim() || "sans-serif";
  const text = String(daysUntil(EVENT_START));
  const wide = w >= 1024;
  // Desktop: Zahl in der linken Hälfte (rechts steht das Login), Handy: oben
  const areaW = (wide ? w * 0.5 : w * 0.9) / cellW;
  const cx = (wide ? w * 0.27 : w * 0.5) / cellW;
  const cy = (wide ? h * 0.5 : h * 0.17) / cellH;
  // Zellen sind höher als breit → Schrift vertikal stauchen, damit die Zahl normal aussieht
  let size = 100;
  o.font = `${size}px ${family}`;
  size = (size * areaW) / o.measureText(text).width;
  o.save();
  o.translate(cx, cy);
  o.scale(1, cellW / cellH);
  o.font = `${size}px ${family}`;
  o.textAlign = "center";
  o.textBaseline = "middle";
  o.fillStyle = "#fff";
  o.fillText(text, 0, 0);
  // Michroma ist sehr dünn: Kontur nachziehen, damit die Ziffern im Raster kräftig genug sind
  o.strokeStyle = "#fff";
  o.lineWidth = size * 0.035;
  o.strokeText(text, 0, 0);
  o.restore();
  const data = o.getImageData(0, 0, cols, rows).data;
  const mask = new Uint8Array(cols * rows);
  for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3] > 110 ? 1 : 0;
  return mask;
}

const drawCharField: Frame = (ctx, w, h, _t, c) => {
  const cellW = 13;
  const cellH = 19;
  const cols = Math.ceil(w / cellW);
  const rows = Math.ceil(h / cellH);
  const key = `${cols}x${rows}:${document.fonts.status}`;
  if (field.key !== key) {
    field.cols = cols;
    field.rows = rows;
    field.cells = Array.from({ length: cols * rows }, () => CHARS[(Math.random() * CHARS.length) | 0]);
    field.mask = buildMask(cols, rows, cellW, cellH, w, h);
    field.key = key;
  } else {
    // pro Bild etwa 3 % der Zeichen wechseln
    const flips = Math.ceil(field.cells.length * 0.03);
    for (let i = 0; i < flips; i++) {
      field.cells[(Math.random() * field.cells.length) | 0] = CHARS[(Math.random() * CHARS.length) | 0];
    }
  }
  ctx.clearRect(0, 0, w, h);
  ctx.font = `12px ${c.mono}`;
  ctx.textBaseline = "top";
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const i = r * cols + col;
      const inNumber = field.mask[i] === 1;
      ctx.globalAlpha = inNumber ? 0.95 : 0.2;
      ctx.fillStyle = inNumber ? c.acc : c.text3;
      ctx.fillText(field.cells[i], col * cellW + 2, r * cellH + 3);
    }
  }
  ctx.globalAlpha = 1;
};

export function CharFieldBackground() {
  const ref = useCanvas(drawCharField, 12);
  return <canvas ref={ref} aria-hidden className={canvasClass} />;
}
