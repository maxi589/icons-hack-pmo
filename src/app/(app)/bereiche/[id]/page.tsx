import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AreaPage, AreaSkeleton } from "@/components/area/area-page";
import { AREA_IDS } from "@/lib/nav";

// Die 5 Bereiche sind fest, deshalb werden ihre Seiten vorab gebaut.
export function generateStaticParams() {
  return AREA_IDS.map((id) => ({ id }));
}

const NAMES: Record<string, string> = {
  venue: "Venue & Event",
  partner: "Track-Partner",
  sponsoren: "Sponsoren",
  jury: "Programm & Jury",
  marketing: "Marketing & Teilnehmer",
};

export async function generateMetadata({ params }: PageProps<"/bereiche/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: NAMES[id] ?? "Bereich" };
}

// Suspense, weil die Seite die Adresse liest (sonst wartet der Seitenwechsel, siehe Next-Hinweis „instant navigation“).
export default function Page({ params }: PageProps<"/bereiche/[id]">) {
  return (
    <Suspense fallback={<AreaSkeleton />}>
      <Area params={params} />
    </Suspense>
  );
}

async function Area({ params }: { params: PageProps<"/bereiche/[id]">["params"] }) {
  const { id } = await params;
  if (!(AREA_IDS as readonly string[]).includes(id)) notFound();
  return <AreaPage id={id} />;
}
