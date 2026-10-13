"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setupAccount, signIn, type LoginState } from "./actions";

type Mode = "signin" | "setup";

export function LoginCard() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const [mode, setMode] = useState<Mode>("signin");
  const [signInState, signInAction, signingIn] = useActionState<LoginState, FormData>(signIn, {});
  const [setupState, setupAction, settingUp] = useActionState<LoginState, FormData>(setupAccount, {});

  const isSetup = mode === "setup";
  const state = isSetup ? setupState : signInState;
  const pending = isSetup ? settingUp : signingIn;

  return (
    <div className="flex w-full max-w-[360px] flex-col gap-6 rounded-2xl bg-card p-7 shadow-card">
      <div className="flex flex-col gap-4">
        <span className="font-display text-[17px] tracking-[0.01em]">icons</span>
        <div className="flex flex-col gap-1">
          <h1 className="text-[21px] font-semibold tracking-[-0.025em]">
            {isSetup ? "Konto einrichten" : "Anmelden"}
          </h1>
          <p className="text-fg-2">
            {isSetup
              ? "Einmalig: Wähle dein Passwort. Den Team-Code findest du in der WhatsApp-Gruppe."
              : "Hackathon-Steuerung für das Orga-Team."}
          </p>
        </div>
      </div>

      <form key={mode} action={isSetup ? setupAction : signInAction} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <Field label="Mail">
          <Input
            name="email"
            type="email"
            autoComplete="username"
            inputMode="email"
            required
            defaultValue={state.email}
            className="h-10"
          />
        </Field>
        <Field label={isSetup ? "Neues Passwort" : "Passwort"} hint={isSetup ? "Mindestens 10 Zeichen." : undefined}>
          <Input
            name="password"
            type="password"
            autoComplete={isSetup ? "new-password" : "current-password"}
            minLength={isSetup ? 10 : undefined}
            required
            className="h-10"
          />
        </Field>
        {isSetup && (
          <Field label="Team-Code">
            <Input name="code" type="text" autoComplete="off" autoCapitalize="none" spellCheck={false} required className="h-10" />
          </Field>
        )}

        {state.error && (
          <p role="alert" className="rounded-lg bg-card-2 px-3 py-2.5 text-[13px] leading-snug text-st-red">
            {state.error}
          </p>
        )}

        <Button type="submit" size="lg" className="h-11 text-[14px]" disabled={pending}>
          {pending ? "Einen Moment …" : isSetup ? "Konto anlegen" : "Anmelden"}
        </Button>
      </form>

      <div className="flex flex-col gap-1.5 text-[13px] leading-snug">
        <button
          type="button"
          onClick={() => setMode(isSetup ? "signin" : "setup")}
          className="self-start rounded-sm font-medium text-acc-line underline-offset-4 hover:underline"
        >
          {isSetup ? "Ich habe schon ein Konto" : "Erstes Mal hier? Konto einrichten"}
        </button>
        {!isSetup && <p className="text-fg-3">Passwort vergessen? Schreib Maxi S, er setzt dein Konto zurück.</p>}
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
