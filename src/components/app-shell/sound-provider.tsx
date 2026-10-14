"use client";

import { useEffect } from "react";
import { play, preloadSounds, richPlayedWithin } from "@/lib/sounds";

// Sounds sind immer an, ohne Schalter; stumm geht über das Gerät.
// Präsenz „Voll“ (Maxi, 14.10.): Dieser Provider hört zentral mit, statt jede Komponente einzeln anzufassen:
// - Klick auf Knöpfe, Links, Zeilen → click-003; Umschalter (Tabs, Filter, Auswahl) → switch-006
// - Tippen in Feldern und Editoren → click-002
// - Detail-Fenster (`data-detail`) geht auf/zu → maximize-006 / minimize-006
// Läuft gerade ein Moment mit eigenem Ton (Abhaken, Zusage, Karte ablegen, Strg+K), bleibt der Klick still.
// Einzelne Elemente schweigen mit `data-sound="none"`.

const CLICKABLE = 'button, a[href], [role="button"], [role="tab"], [role="radio"], [role="switch"], [role="option"], [role="menuitem"], summary';

function isToggle(el: Element) {
  const role = el.getAttribute("role");
  return el.hasAttribute("aria-pressed") || role === "tab" || role === "radio" || role === "switch";
}

function isTextField(el: EventTarget | null) {
  const e = el as HTMLElement | null;
  if (!e) return false;
  if (e.isContentEditable || e.tagName === "TEXTAREA") return true;
  return e.tagName === "INPUT" && /^(text|search|email|url|tel|password|number|)$/.test((e as HTMLInputElement).type);
}

export function SoundProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Dekodiert die Sounds bei der ersten Berührung vor (Browser erlauben Ton erst nach einer Nutzer-Aktion).
    const warmUp = () => {
      preloadSounds();
      window.removeEventListener("pointerdown", warmUp, true);
      window.removeEventListener("keydown", warmUp, true);
    };
    window.addEventListener("pointerdown", warmUp, true);
    window.addEventListener("keydown", warmUp, true);

    // Klicks: in der Capture-Phase merken (auch wenn eine Komponente das Ereignis stoppt) und erst nach allen
    // Handlern entscheiden, ob schon ein eigener Ton lief.
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.(CLICKABLE);
      if (!el || el.closest('[data-sound="none"]')) return;
      if ((el as HTMLButtonElement).disabled || el.getAttribute("aria-disabled") === "true") return;
      const kind = isToggle(el) ? "toggle" : "click";
      setTimeout(() => {
        if (!richPlayedWithin(120)) play(kind);
      }, 0);
    };
    const onChange = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (!t || t.closest('[data-sound="none"]')) return;
      if (t.tagName === "SELECT" || (t as HTMLInputElement).type === "checkbox") play("toggle");
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing || !isTextField(e.target)) return;
      if (e.key.length === 1 || e.key === "Backspace" || e.key === "Delete" || e.key === "Enter") play("type");
    };

    // Detail-Fenster auf/zu: Elemente mit `data-detail` erscheinen bzw. verschwinden.
    const has = (nodes: NodeList) =>
      [...nodes].some((n) => n instanceof Element && (n.matches("[data-detail]") || !!n.querySelector("[data-detail]")));
    const observer = new MutationObserver((list) => {
      let opened = false;
      let closed = false;
      for (const m of list) {
        if (has(m.addedNodes)) opened = true;
        if (has(m.removedNodes)) closed = true;
      }
      if (opened && !closed) play("detailOpen");
      else if (closed && !opened) play("detailClose");
    });
    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener("click", onClick, true);
    window.addEventListener("change", onChange, true);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("pointerdown", warmUp, true);
      window.removeEventListener("keydown", warmUp, true);
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("change", onChange, true);
      window.removeEventListener("keydown", onKey, true);
      observer.disconnect();
    };
  }, []);

  return children;
}
