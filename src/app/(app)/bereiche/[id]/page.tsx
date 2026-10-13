import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AreaPage, AreaSkeleton } from "@/components/area/area-page";
import { AREA_IDS } from "@/lib/nav";

// Die 7 Bereiche sind fest, deshalb werden ihre Seiten vorab gebaut.
export function generateStaticParams() {
  return AREA_IDS.map((id) => ({ id }));
}

const nameOf = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);

export async function generateMetadata({ params }: PageProps<"/bereiche/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `${nameOf(id)} · icons Hackathon PMO` };
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
