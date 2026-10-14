import { Suspense } from "react";
import type { Metadata } from "next";
import { Pipeline } from "@/components/pipeline/pipeline";

export const metadata: Metadata = { title: "Pipeline" };

// Suspense, weil die Pipeline ihren Zustand aus der Adresse liest (?tab=…&firma=…).
export default function PipelinePage() {
  return (
    <Suspense fallback={<div className="m-3.5 h-[420px] rounded-xl bg-card-2 md:m-5" aria-busy="true" />}>
      <Pipeline />
    </Suspense>
  );
}
