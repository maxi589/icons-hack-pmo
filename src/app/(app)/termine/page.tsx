import { Suspense } from "react";
import type { Metadata } from "next";
import { Termine } from "@/components/termine/termine";

export const metadata: Metadata = { title: "Termine" };

// Suspense, weil die Seite ihren Zustand aus der Adresse liest (?termin=…, ?woche=…, ?ansicht=…, ?neu=1).
export default function TerminePage() {
  return (
    <Suspense fallback={<div className="m-3.5 h-[420px] rounded-xl bg-card-2 md:m-5" aria-busy="true" />}>
      <Termine />
    </Suspense>
  );
}
