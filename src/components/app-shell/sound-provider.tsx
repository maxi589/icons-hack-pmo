"use client";

import { useEffect } from "react";
import { preloadSounds } from "@/lib/sounds";

// Sounds sind immer an (Maxi, 14.10.): kein Schalter, kein Fun-Modus. Stumm geht über das Gerät.
// Dekodiert die Sounds bei der ersten Berührung vor (Browser erlauben Ton erst nach einer Nutzer-Aktion).

export function SoundProvider({ children }: { children: React.ReactNode }) {
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

  return children;
}
