import type { Metadata } from "next";
import { ComingSoon } from "@/components/app-shell/coming-soon";

export const metadata: Metadata = { title: "Pipeline · icons Hackathon PMO" };

export default function PipelinePage() {
  return <ComingSoon title="Pipeline" note="Partner, Sponsoren, Venues und Jury als Board und Liste, mit Nachfass-Terminen." />;
}
