import type { Metadata } from "next";
import { ComingSoon } from "@/components/app-shell/coming-soon";

export const metadata: Metadata = { title: "Aufgaben · icons Hackathon PMO" };

export default function TasksPage() {
  return <ComingSoon title="Aufgaben" note="Board und Liste, filterbar nach Bereich, Person und Meilenstein." />;
}
