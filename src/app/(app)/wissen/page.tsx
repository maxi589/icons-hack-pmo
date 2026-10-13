import { Suspense } from "react";
import type { Metadata } from "next";
import { Knowledge } from "@/components/wissen/knowledge";

export const metadata: Metadata = { title: "Wissen & Entscheidungen · icons Hackathon PMO" };

// Suspense, weil die Seite ihren Zustand aus der Adresse liest (?entscheidung=…, ?neu=1).
export default function KnowledgePage() {
  return (
    <Suspense fallback={<div className="m-3.5 h-[420px] rounded-xl bg-card-2 md:m-5" aria-busy="true" />}>
      <Knowledge />
    </Suspense>
  );
}
