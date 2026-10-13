import type { Metadata } from "next";
import { ComingSoon } from "@/components/app-shell/coming-soon";

export const metadata: Metadata = { title: "Roadmap · icons Hackathon PMO" };

export default function RoadmapPage() {
  return <ComingSoon title="Roadmap" note="Zeitstrahl mit allen Meilensteinen vom 1.10. bis zum Hackathon am 27.2." />;
}
