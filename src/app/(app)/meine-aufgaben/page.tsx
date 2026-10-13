import { Suspense } from "react";
import type { Metadata } from "next";
import { Tasks } from "@/components/tasks/tasks";

export const metadata: Metadata = { title: "Meine Aufgaben · icons Hackathon PMO" };

export default function MyTasksPage() {
  return (
    <Suspense fallback={<div className="m-3.5 h-[420px] rounded-xl bg-card-2 md:m-5" aria-busy="true" />}>
      <Tasks mine />
    </Suspense>
  );
}
