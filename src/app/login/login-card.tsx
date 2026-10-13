"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login, type LoginState } from "./actions";

export function LoginCard() {
  const params = useSearchParams();
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  // Eingaben selbst halten, damit sie nach dem Absenden stehen bleiben (React setzt Formulare sonst zurück)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const firstTime = Boolean(state.firstTime);

  return (
    <div className="flex w-full max-w-[360px] flex-col gap-6 rounded-2xl bg-card p-7 shadow-card">
      <div className="flex flex-col gap-1">
        <span className="font-display text-[17px] tracking-[0.01em]">icons</span>
        <h1 className="mt-3 text-[21px] font-semibold tracking-[-0.025em]">Anmelden</h1>
        <p className="text-fg-2">Steuerung für das Orga-Team.</p>
      </div>

      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={params.get("next") ?? "/"} />
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
        <Field label="Passwort" hint={firstTime ? "Mindestens 10 Zeichen." : undefined}>
          <Input
            name="password"
            type="password"
            autoComplete={firstTime ? "new-password" : "current-password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-10"
          />
        </Field>

        {firstTime && (
          <>
            <p className="rounded-lg bg-card-2 px-3 py-2.5 text-[13px] leading-snug text-fg-2">
              <span className="font-medium text-fg">Willkommen!</span> Du bist zum ersten Mal hier. Wiederhole dein
              Passwort, dann ist es gespeichert.
            </p>
            <Field label="Passwort wiederholen">
              <Input name="confirm" type="password" autoComplete="new-password" required autoFocus className="h-10" />
            </Field>
          </>
        )}

        {state.error && (
          <p role="alert" className="rounded-lg bg-card-2 px-3 py-2.5 text-[13px] leading-snug text-st-red">
            {state.error}
          </p>
        )}

        <Button type="submit" size="lg" className="h-11 text-[14px]" disabled={pending}>
          {pending ? "Einen Moment …" : firstTime ? "Passwort festlegen" : "Anmelden"}
        </Button>
      </form>

      <p className="text-[12.5px] leading-snug text-fg-3">
        Nur für das Orga-Team. Passwort vergessen? Schreib Maxi S.
      </p>
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
