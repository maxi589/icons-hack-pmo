import type { Metadata } from "next";
import { ComingSoon } from "@/components/app-shell/coming-soon";

export const metadata: Metadata = { title: "Wissen & Entscheidungen · icons Hackathon PMO" };

export default function KnowledgePage() {
  return <ComingSoon title="Wissen & Entscheidungen" note="Entscheidungen mit Datum und wichtige Links an einem Ort." />;
}
