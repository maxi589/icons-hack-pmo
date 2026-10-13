import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Countdown } from "@/components/countdown";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserBadge } from "@/components/user-badge";

// Vorläufige Startseite: prüft Farben, Schriften und Bausteine des Grundgerüsts.
// Wird durch Login und Übersicht ersetzt.

const AREAS = [
  ["Partner", "bg-area-partner"],
  ["Sponsoren", "bg-area-sponsoren"],
  ["Venue", "bg-area-venue"],
  ["Marketing", "bg-area-marketing"],
  ["Jury", "bg-area-jury"],
  ["Teilnehmer", "bg-area-teilnehmer"],
  ["Event", "bg-area-event"],
] as const;

const STATUS = [
  ["Offen", "text-st-gray", "bg-st-gray"],
  ["Läuft", "text-st-blue", "bg-st-blue"],
  ["Verzögert", "text-st-amber", "bg-st-amber"],
  ["Erledigt", "text-st-green", "bg-st-green"],
  ["Überfällig", "text-st-red", "bg-st-red"],
] as const;

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-bg p-2">
      <main className="mx-auto flex w-full max-w-[1080px] flex-1 flex-col gap-6 rounded-[14px] bg-panel p-6 shadow-card md:p-8">
        <header className="flex items-center justify-between">
          <span className="font-display text-[15px] tracking-[0.01em]">icons</span>
          <div className="flex items-center gap-3">
            <UserBadge />
            <ThemeToggle />
          </div>
        </header>

        <section className="flex flex-col gap-1">
          <h1 className="text-[21px] font-semibold tracking-[-0.025em] md:text-[26px]">Grundgerüst steht</h1>
          <p className="text-fg-2">Farben, Schriften und Bausteine aus dem Design-System „Graphit“.</p>
        </section>

        <section className="flex flex-col gap-3 rounded-[14px] bg-card p-5 shadow-card">
          <span className="label-mono">Countdown</span>
          <div className="flex items-baseline gap-3">
            <Countdown />
            <span className="text-fg-2">Tage bis zum Hackathon · Sa, 27.2.2027</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-card-2">
            <div className="h-full w-1/5 rounded-full bg-acc-line" />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-[14px] bg-card p-5 shadow-card">
            <span className="label-mono">Bedienelemente</span>
            <div className="flex flex-wrap gap-2">
              <Button>
                <Plus aria-hidden /> Neue Aufgabe
              </Button>
              <Button variant="outline">Abbrechen</Button>
              <Button variant="ghost">Mehr</Button>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] text-fg-2">Firma suchen</span>
              <Input placeholder="z. B. Talent Elevator" />
            </label>
            <p className="text-[13px] text-fg-2">
              Erwähnung: <span className="font-medium text-acc-line">@Maxi D</span> · Chip:{" "}
              <span className="rounded-full bg-acc px-2 py-0.5 text-[12px] font-medium text-acc-text">heute</span>
            </p>
          </div>

          <div className="flex flex-col gap-3 rounded-[14px] bg-card p-5 shadow-card">
            <span className="label-mono">Status &amp; Bereiche</span>
            <ul className="flex flex-wrap gap-x-4 gap-y-2">
              {STATUS.map(([label, text, dot]) => (
                <li key={label} className={`flex items-center gap-1.5 text-[13px] ${text}`}>
                  <span className={`size-2 rounded-full ${dot}`} aria-hidden />
                  {label}
                </li>
              ))}
            </ul>
            <ul className="flex flex-wrap gap-x-4 gap-y-2">
              {AREAS.map(([label, dot]) => (
                <li key={label} className="flex items-center gap-1.5 text-[13px] text-fg-2">
                  <span className={`size-2 rounded-full ${dot}`} aria-hidden />
                  {label}
                </li>
              ))}
            </ul>
            <p className="font-mono text-[12px] text-fg-3 tabular">M1.2 · 18.10. · 0123456789</p>
          </div>
        </section>
      </main>
    </div>
  );
}
