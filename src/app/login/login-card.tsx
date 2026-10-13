"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GOOGLE_HOSTED_DOMAIN, safeNext } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const ERRORS: Record<string, string> = {
  "kein-zugang": "Diese Adresse hat keinen Zugang. Melde dich mit deiner icons-Adresse aus dem Orga-Team an.",
  abgebrochen: "Die Anmeldung wurde abgebrochen. Versuch es noch einmal.",
  anmeldung: "Die Anmeldung hat nicht geklappt. Versuch es noch einmal.",
};

export function LoginCard() {
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(ERRORS[params.get("fehler") ?? ""] ?? null);

  async function signIn() {
    setBusy(true);
    setError(null);
    const next = safeNext(params.get("next"));
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        queryParams: { hd: GOOGLE_HOSTED_DOMAIN, prompt: "select_account" },
      },
    });
    if (error) {
      setBusy(false);
      setError(ERRORS.anmeldung);
    }
  }

  return (
    <div className="flex w-full max-w-[360px] flex-col gap-6 rounded-2xl bg-card p-7 shadow-card">
      <div className="flex flex-col gap-4">
        <span className="font-display text-[17px] tracking-[0.01em]">icons</span>
        <div className="flex flex-col gap-1">
          <h1 className="text-[21px] font-semibold tracking-[-0.025em]">Anmelden</h1>
          <p className="text-fg-2">Hackathon-Steuerung für das Orga-Team.</p>
        </div>
      </div>

      <Button size="lg" className="h-11 text-[14px]" onClick={signIn} disabled={busy}>
        <GoogleMark />
        {busy ? "Weiter zu Google …" : "Mit Google anmelden"}
      </Button>

      {error ? (
        <p role="alert" className="rounded-lg bg-card-2 px-3 py-2.5 text-[13px] leading-snug text-st-red">
          {error}
        </p>
      ) : (
        <p className="text-[13px] leading-snug text-fg-3">
          Nur mit deinem icons-Konto ({`@${GOOGLE_HOSTED_DOMAIN}`}). Danach bleibst du auf diesem Gerät angemeldet.
        </p>
      )}
    </div>
  );
}

// Google-„G“ einfarbig, damit es auf der Lime-Fläche lesbar bleibt
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4" fill="currentColor">
      <path d="M21.35 11.1H12v2.98h5.35c-.23 1.4-1.66 4.1-5.35 4.1-3.22 0-5.85-2.67-5.85-5.96S8.78 6.26 12 6.26c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.68 3.7 14.55 2.75 12 2.75 6.89 2.75 2.75 6.89 2.75 12s4.14 9.25 9.25 9.25c5.34 0 8.88-3.75 8.88-9.04 0-.61-.07-1.07-.15-1.53z" />
    </svg>
  );
}
