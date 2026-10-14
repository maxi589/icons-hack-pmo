import type { Metadata } from "next";
import { Roadmap } from "@/components/roadmap/roadmap";

export const metadata: Metadata = { title: "Roadmap" };

export default function RoadmapPage() {
  return <Roadmap />;
}
