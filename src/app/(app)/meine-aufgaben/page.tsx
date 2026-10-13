import type { Metadata } from "next";
import { ComingSoon } from "@/components/app-shell/coming-soon";

export const metadata: Metadata = { title: "Meine Aufgaben · icons Hackathon PMO" };

export default function MyTasksPage() {
  return <ComingSoon title="Meine Aufgaben" note="Alles, was dir zugewiesen ist, sortiert nach Fälligkeit." />;
}
