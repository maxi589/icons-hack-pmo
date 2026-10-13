import type { Metadata } from "next";
import { Roadmap } from "@/components/roadmap/roadmap";

export const metadata: Metadata = { title: "Roadmap · icons Hackathon PMO" };

export default function RoadmapPage() {
  return <Roadmap />;
}
