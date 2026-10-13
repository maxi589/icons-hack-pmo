import { PageHeader } from "@/components/app-shell/page-header";
import { Countdown } from "@/components/countdown";

// Vorläufige Übersicht: nur Countdown. Der nächste Bauplan-Schritt füllt die Seite laut Board.
export default function OverviewPage() {
  return (
    <>
      <PageHeader title="Übersicht" />
      <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-5 px-3.5 pt-2 pb-8 md:px-8 md:pt-8">
        <h1 className="text-[21px] font-semibold tracking-[-0.025em] md:text-[26px]">Übersicht</h1>
        <section className="flex flex-col gap-5 rounded-[14px] bg-card p-5 shadow-card md:px-6 md:py-[22px]">
          <span className="label-mono">Countdown</span>
          <div className="flex flex-wrap items-end gap-4">
            <Countdown />
            <div className="flex flex-col gap-1 pb-0.5">
              <span className="text-base font-medium">Tage bis zum Hackathon</span>
              <span className="text-[13px] text-fg-2">Sa 27. – So 28. Februar 2027 · 24 Stunden</span>
            </div>
          </div>
        </section>
        <p className="text-[13px] text-fg-3">Phasen, Meilensteine, Zielzahlen und Nachfassen folgen im nächsten Schritt.</p>
      </div>
    </>
  );
}
