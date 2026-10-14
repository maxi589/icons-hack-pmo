import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginBackdrop } from "./login-backdrop";
import { LoginCard } from "./login-card";

export const metadata: Metadata = { title: "Anmelden" };

// Login immer dunkel (Klasse .dark setzt die dunklen Tokens), Hintergrund tiefschwarz.
export default function LoginPage() {
  return (
    <main className="dark relative flex flex-1 items-center justify-center bg-black px-4 py-12 pb-[max(3rem,env(safe-area-inset-bottom))] text-fg [color-scheme:dark]">
      <LoginBackdrop />
      <div className="relative z-10 flex w-full justify-center">
        <Suspense>
          <LoginCard />
        </Suspense>
      </div>
    </main>
  );
}
