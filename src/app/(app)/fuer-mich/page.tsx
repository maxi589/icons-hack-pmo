import { Suspense } from "react";
import type { Metadata } from "next";
import { FuerMich } from "@/components/fuer-mich/fuer-mich";

export const metadata: Metadata = { title: "Für mich" };

export default function FuerMichPage() {
  return (
    <Suspense fallback={<div className="m-3.5 h-[420px] rounded-xl bg-card-2 md:m-5" aria-busy="true" />}>
      <FuerMich />
    </Suspense>
  );
}
