"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { play, preloadSounds, setSoundPrefs } from "@/lib/sounds";
import { useTeam } from "./team-provider";

// Schalter „Sounds“ und „Fun-Modus“ (Tabelle user_settings, gilt auf allen Geräten der Person).
// Dekodiert die Sounds bei der ersten Berührung vor und spielt im Fun-Modus Klick-, Schalter- und Tipp-Töne.

type Prefs = { sounds: boolean; fun: boolean };
type SoundSettings = Prefs & { setPrefs: (p: Partial<Prefs>) => void };

const SoundContext = createContext<SoundSettings>({ sounds: true, fun: false, setPrefs: () => {} });

export function useSoundSettings() {
  return useContext(SoundContext);
}

const TOGGLES = "[role=switch], [role=radio], [role=checkbox], input[type=checkbox], input[type=radio]";
const CLICKABLE = "button, a[href], [role=button], [role=option], [role=tab], [role=menuitem], summary";

function isField(el: Element | null) {
  return !!el && ((el as HTMLElement).isContentEditable || el.matches("textarea, input:not([type=checkbox], [type=radio], [type=button], [type=submit])"));
}

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const { me } = useTeam();
  const [prefs, setState] = useState<Prefs>({ sounds: true, fun: false });

  useEffect(() => {
    if (!me) return;
    createClient()
      .from("user_settings")
      .select("sounds, fun_mode")
      .eq("person_id", me.id)
      .maybeSingle()
      .then(({ data }) => {
        const loaded = { sounds: data?.sounds ?? true, fun: data?.fun_mode ?? false };
        setState(loaded);
        setSoundPrefs(loaded);
      });
  }, [me]);

  // Erst nach der ersten Nutzer-Aktion vorladen (Browser-Regel für Ton).
  useEffect(() => {
    const warmUp = () => {
      preloadSounds();
      window.removeEventListener("pointerdown", warmUp, true);
      window.removeEventListener("keydown", warmUp, true);
    };
    window.addEventListener("pointerdown", warmUp, true);
    window.addEventListener("keydown", warmUp, true);
    return () => {
      window.removeEventListener("pointerdown", warmUp, true);
      window.removeEventListener("keydown", warmUp, true);
    };
  }, []);

  // Fun-Modus: play() spielt diese Töne nur, wenn er an ist.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = e.target as Element | null;
      if (!el?.closest || isField(el)) return;
      if (el.closest(TOGGLES)) play("toggle");
      else if (el.closest(CLICKABLE)) play("click");
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || !isField(e.target as Element | null)) return;
      if (e.key.length === 1 || e.key === "Backspace" || e.key === "Enter") play("type");
    };
    window.addEventListener("click", onClick, true);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("keydown", onKey, true);
    };
  }, []);

  const setPrefs = useCallback(
    (patch: Partial<Prefs>) => {
      if (!me) return;
      const before = prefs;
      const next = { ...prefs, ...patch };
      setState(next);
      setSoundPrefs(next);
      // Hörbare Bestätigung beim Einschalten.
      if (patch.sounds) play("taskDone");
      if (patch.fun) play("toggle");
      createClient()
        .from("user_settings")
        .upsert({ person_id: me.id, sounds: next.sounds, fun_mode: next.fun })
        .then(({ error }) => {
          if (!error) return;
          setState(before);
          setSoundPrefs(before);
        });
    },
    [me, prefs]
  );

  return <SoundContext value={{ ...prefs, setPrefs }}>{children}</SoundContext>;
}
