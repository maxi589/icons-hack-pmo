"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login, type LoginState } from "./actions";
import { EVENT_NAME } from "@/lib/brand";
import { MIN_PASSWORD } from "@/lib/auth";

// Zwei Ansichten: „Anmelden“ und beim ersten Mal „Passwort festlegen“ (neues Passwort + bestätigen).
// Zur zweiten kommt man über den Link unten oder automatisch, wenn die Mail auf der Team-Liste noch kein Konto hat.
export function LoginCard() {
  const params = useSearchParams();
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  // Eingaben selbst halten, damit sie nach dem Absenden stehen bleiben (React setzt Formulare sonst zurück)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [setup, setSetup] = useState(false);

  // Die Antwort vom Server bestimmt die Ansicht: firstTime → „Passwort festlegen“, sonst „Anmelden“
  // (z. B. „Für diese Mail gibt es schon ein Passwort“). Wechselt die Ansicht, werden die Passwortfelder geleert.
  const [seen, setSeen] = useState(state);
  const [stale, setStale] = useState(false); // nach Klick auf den Umschalt-Link gilt die letzte Antwort nicht mehr
  if (state !== seen) {
    setSeen(state);
    setStale(false);
    if (Boolean(state.firstTime) !== setup) switchView(Boolean(state.firstTime));
  }

  function switchView(toSetup: boolean) {
    setSetup(toSetup);
    setPassword("");
    setConfirm("");
  }
  const error = stale ? undefined : state.error;
  const newAccount = !stale && state.firstTime && !state.error;

  return (
    <div className="flex w-full max-w-[360px] flex-col gap-6 rounded-2xl bg-card p-7 shadow-card">
      <div className="flex flex-col gap-1">
        <span className="font-display text-[17px] tracking-[0.01em]">{EVENT_NAME}</span>
        <span className="label-mono">by icons</span>
        <h1 className="mt-3 text-[21px] font-semibold tracking-[-0.025em]">
          {setup ? "Passwort festlegen" : "Anmelden"}
        </h1>
      </div>

      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={params.get("next") ?? "/"} />
        <input type="hidden" name="mode" value={setup ? "setup" : "login"} />

        {setup && (
          <p className="rounded-lg bg-card-2 px-3 py-2.5 text-[13px] leading-snug text-fg-2">
            {newAccount && <span className="font-medium text-fg">Noch kein Passwort für diese Mail. </span>}
            Leg dein eigenes HQ-Passwort fest, nicht dein icons-Passwort.
          </p>
        )}

        <Field label="Mail">
          <Input
            name="email"
            type="email"
            autoComplete="username"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10"
          />
        </Field>
        <Field
          label={setup ? "Neues Passwort" : "Passwort"}
          hint={setup ? `Mindestens ${MIN_PASSWORD} Zeichen.` : "Dein HQ-Passwort, nicht dein icons-Passwort."}
        >
          <Input
            key={setup ? "new" : "current"}
            name="password"
            type="password"
            autoComplete={setup ? "new-password" : "current-password"}
            autoFocus={newAccount}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-10"
          />
        </Field>
        {setup && (
          <Field label="Passwort bestätigen">
            <Input
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="h-10"
            />
          </Field>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-card-2 px-3 py-2.5 text-[13px] leading-snug text-st-red">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" className="h-11 text-[14px]" disabled={pending}>
          {pending ? "Einen Moment …" : setup ? "Passwort festlegen" : "Anmelden"}
        </Button>
      </form>

      <div className="flex flex-col gap-1.5 text-[12.5px] leading-snug text-fg-3">
        <button
          type="button"
          onClick={() => {
            setStale(true);
            switchView(!setup);
          }}
          className="self-start text-fg-2 underline-offset-2 hover:text-fg hover:underline"
        >
          {setup ? "Schon ein Passwort? Anmelden" : "Erstes Mal hier? Passwort festlegen"}
        </button>
        <span>Passwort vergessen? Schreib Maxi S.</span>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] text-fg-2">{label}</span>
      {children}
      {hint && <span className="text-[12px] text-fg-3">{hint}</span>}
    </label>
  );
}
