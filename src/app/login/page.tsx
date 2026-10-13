import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginCard } from "./login-card";

export const metadata: Metadata = { title: "Anmelden · icons Hackathon PMO" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-bg px-4 py-12 pb-[max(3rem,env(safe-area-inset-bottom))]">
      <Suspense>
        <LoginCard />
      </Suspense>
    </main>
  );
}
