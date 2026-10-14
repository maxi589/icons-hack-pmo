import { Suspense } from "react";
import type { Metadata } from "next";
import { Documents } from "@/components/dokumente/documents";

export const metadata: Metadata = { title: "Dokumente" };

// Suspense, weil die Seite ihren Zustand aus der Adresse liest (?dok=…, ?entscheidung=…, ?neu=…).
export default function DocumentsPage() {
  return (
    <Suspense fallback={<div className="m-3.5 h-[420px] rounded-xl bg-card-2 md:m-5" aria-busy="true" />}>
      <Documents />
    </Suspense>
  );
}
