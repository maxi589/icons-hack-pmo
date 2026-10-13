"use client";

import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { daysUntil, EVENT_START, todayInVienna } from "@/lib/dates";
import { cn } from "@/lib/utils";
import milestoneData from "../../../../docs/daten/meilensteine.json";

// ---------- echte Projektdaten ----------
const MILESTONES = milestoneData.meilensteine;
const PHASES = [
  { name: "Vorbereitung", from: "2026-10-01", to: "2026-10-18" },
  { name: "Outreach", from: "2026-10-19", to: "2026-12-18" },
  { name: "Jury", from: "2026-12-19", to: "2027-01-15" },
  { name: "Anmeldung", from: "2027-01-16", to: "2027-02-23" },
  { name: "Event", from: "2027-02-24", to: "2027-02-28" },
];
const TIMELINE = { from: "2026-10-01", to: "2027-02-28" };

const dayNum = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return Date.UTC(y, m - 1, day) / 86_400_000;
};
const fmt = (d: string) => {
  const [, m, day] = d.split("-").map(Number);
  return `${day}.${m}.`;
};
const WEEKDAY = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const weekday = (d: string) => WEEKDAY[new Date(`${d}T12:00:00Z`).getUTCDay()];

function useToday() {
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => {
    const t = () => setToday(todayInVienna());
    t();
    const id = setInterval(t, 60_000);
    return () => clearInterval(id);
  }, []);
  return today;
}

function useClock() {
  const [now, setNow] = useState<string>("--:--:--");
  useEffect(() => {
    const f = new Intl.DateTimeFormat("de-AT", {
      timeZone: "Europe/Vienna",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const t = () => setNow(f.format(new Date()));
    t();
    const id = setInterval(t, 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function nextMilestone(today: string) {
  return MILESTONES.filter((m) => m.deadline >= today).sort((a, b) => a.deadline.localeCompare(b.deadline))[0];
}

function currentPhase(today: string) {
  const i = PHASES.findIndex((p) => today <= p.to);
  const idx = i === -1 ? PHASES.length - 1 : i;
  const p = PHASES[idx];
  const share = Math.min(1, Math.max(0, (dayNum(today) - dayNum(p.from) + 1) / (dayNum(p.to) - dayNum(p.from) + 1)));
  return { idx, share };
}

// ---------- Rahmen mit Umschalter ----------
const VARIANTS = [
  { id: "a", label: "A · Countdown" },
  { id: "b", label: "B · Terminal" },
  { id: "c", label: "C · Zeitstrahl" },
  { id: "d", label: "D · Orga-Pass" },
] as const;
type VariantId = (typeof VARIANTS)[number]["id"];

export function Drafts() {
  const [v, setV] = useState<VariantId>("a");
  const today = useToday();

  return (
    <div className="relative flex min-h-dvh flex-1 flex-col bg-bg">
      <div className="fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3">
        <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-card p-1 shadow-card">
          {VARIANTS.map((x) => (
            <button
              key={x.id}
              type="button"
              onClick={() => setV(x.id)}
              aria-pressed={v === x.id}
              className={cn(
                "shrink-0 rounded-lg px-3 py-1.5 text-[13px] text-fg-2 transition-colors duration-150 hover:bg-hover hover:text-fg",
                v === x.id && "bg-active font-medium text-fg"
              )}
            >
              {x.label}
            </button>
          ))}
          <span className="mx-1 h-5 w-px shrink-0 bg-line-2" aria-hidden />
          <ThemeToggle className="shrink-0" />
        </div>
      </div>

      {today && (
        <>
          {v === "a" && <VariantCountdown today={today} />}
          {v === "b" && <VariantTerminal today={today} />}
          {v === "c" && <VariantTimeline today={today} />}
          {v === "d" && <VariantPass today={today} />}
        </>
      )}
    </div>
  );
}

// ---------- gemeinsame Bausteine (Attrappe, sendet nichts) ----------
function Field({ label, type, auto }: { label: string; type: string; auto: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] text-fg-2">{label}</span>
      <input
        type={type}
        autoComplete={auto}
        className="h-10 rounded-[10px] bg-panel px-3 text-[14px] text-fg shadow-[inset_0_0_0_1px_var(--field)] outline-none transition-shadow duration-150 focus-visible:shadow-[inset_0_0_0_1px_var(--accLine)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acc-line"
      />
    </label>
  );
}

function PrimaryButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="h-11 rounded-[10px] bg-acc text-[14px] font-medium text-acc-text transition-transform duration-150 ease-out active:scale-[.97]"
    >
      {children}
    </button>
  );
}

function FormBody() {
  return (
    <div className="flex flex-col gap-4">
      <Field label="Mail" type="email" auto="off" />
      <Field label="Passwort" type="password" auto="off" />
      <PrimaryButton>Anmelden</PrimaryButton>
      <span className="text-[13px] font-medium text-acc-line">Erstes Mal hier? Konto einrichten</span>
    </div>
  );
}

function PhaseStepper({ today, compact }: { today: string; compact?: boolean }) {
  const { idx, share } = currentPhase(today);
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-5 gap-1.5">
        {PHASES.map((p, i) => (
          <div key={p.name} className="h-1.5 overflow-hidden rounded-full bg-card-2 shadow-[inset_0_0_0_1px_var(--line)]">
            <div
              className="h-full rounded-full bg-acc-line"
              style={{ width: i < idx ? "100%" : i === idx ? `${Math.round(share * 100)}%` : "0%" }}
            />
          </div>
        ))}
      </div>
      {!compact && (
        <div className="grid grid-cols-5 gap-1.5">
          {PHASES.map((p, i) => (
            <span key={p.name} className={cn("truncate text-[11.5px]", i === idx ? "font-medium text-fg" : "text-fg-3")}>
              {p.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- A · Countdown ----------
function VariantCountdown({ today }: { today: string }) {
  const days = daysUntil(EVENT_START);
  const next = nextMilestone(today);
  const inDays = daysUntil(next.deadline);
  return (
    <div className="grid flex-1 lg:grid-cols-[1.25fr_1fr]">
      <section className="flex flex-col justify-between gap-10 border-line px-6 pt-20 pb-8 sm:px-10 lg:border-r lg:pb-10">
        <span className="label-mono">icons Hackathon · Wien · 27.–28.02.2027</span>
        <div className="flex flex-col gap-4">
          <span className="font-display tabular text-[96px] leading-[0.9] tracking-[0.01em] sm:text-[140px] xl:text-[188px]">
            {days}
          </span>
          <span className="text-[17px] text-fg-2">Tage bis zum Kickoff</span>
        </div>
        <div className="flex max-w-[560px] flex-col gap-5">
          <PhaseStepper today={today} />
          <p className="text-[13.5px] text-fg-2">
            Als Nächstes: <span className="font-mono text-fg-3">{next.id}</span>{" "}
            <span className="text-fg">{next.titel}</span> · {weekday(next.deadline)}, {fmt(next.deadline)} ·{" "}
            in {inDays} {inDays === 1 ? "Tag" : "Tagen"}
          </p>
        </div>
      </section>
      <section className="flex items-center justify-center px-6 pt-4 pb-16 sm:px-10 lg:pt-16">
        <div className="flex w-full max-w-[340px] flex-col gap-6">
          <div className="flex flex-col gap-1">
            <span className="font-display text-[17px]">icons</span>
            <h1 className="mt-3 text-[21px] font-semibold tracking-[-0.025em]">Anmelden</h1>
            <p className="text-fg-2">Steuerung für das Orga-Team.</p>
          </div>
          <FormBody />
        </div>
      </section>
    </div>
  );
}

// ---------- B · Terminal ----------
function VariantTerminal({ today }: { today: string }) {
  const clock = useClock();
  const next = nextMilestone(today);
  const days = daysUntil(EVENT_START);
  const lines: [string, string][] = [
    ["ok", "Verbindung zu icons-hack-pmo hergestellt"],
    ["ok", `${MILESTONES.length} Meilensteine geladen`],
    ["ok", "Pipeline bereit: 93 Firmen, 21 Venues"],
    ["..", `Nächste Frist: ${next.id} ${next.titel}, ${weekday(next.deadline)} ${fmt(next.deadline)}`],
    ["..", `Kickoff in ${days} Tagen`],
  ];
  return (
    <div className="flex flex-1 items-center justify-center px-4 pt-20 pb-10">
      <div className="w-full max-w-[600px] overflow-hidden rounded-2xl bg-card font-mono shadow-card">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5 text-[12px] text-fg-3">
          <span>icons@hackathon: ~/login</span>
          <span className="tabular">{clock}</span>
        </div>
        <div className="flex flex-col gap-1.5 px-5 pt-5 pb-2 text-[13px] leading-relaxed">
          <p className="text-fg">
            <span className="text-acc-line">$</span> icons login
          </p>
          {lines.map(([tag, text], i) => (
            <p
              key={text}
              className="animate-in fade-in fill-mode-both duration-300 text-fg-2"
              style={{ animationDelay: `${150 + i * 220}ms` }}
            >
              <span className={tag === "ok" ? "text-st-green" : "text-fg-3"}>[{tag}]</span> {text}
            </p>
          ))}
        </div>
        <div
          className="flex flex-col gap-3 px-5 pt-3 pb-5 animate-in fade-in fill-mode-both duration-300"
          style={{ animationDelay: `${150 + lines.length * 220}ms` }}
        >
          <TermInput prompt="mail" type="email" />
          <TermInput prompt="passwort" type="password" />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button type="button" className="h-10 rounded-[10px] bg-acc px-4 text-[13px] font-medium text-acc-text active:scale-[.97]">
              anmelden ⏎
            </button>
            <span className="text-[12.5px] text-acc-line">--erstes-mal  Konto einrichten</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TermInput({ prompt, type }: { prompt: string; type: string }) {
  return (
    <label className="flex items-center gap-3 rounded-[10px] bg-panel px-3 shadow-[inset_0_0_0_1px_var(--field)] focus-within:shadow-[inset_0_0_0_1px_var(--accLine)]">
      <span className="w-[88px] shrink-0 whitespace-nowrap text-[12.5px] text-fg-3">{prompt} ›</span>
      <input
        type={type}
        autoComplete="off"
        className="h-10 min-w-0 flex-1 bg-transparent text-[14px] text-fg caret-acc-line outline-none"
      />
    </label>
  );
}

// ---------- C · Zeitstrahl ----------
function VariantTimeline({ today }: { today: string }) {
  const span = dayNum(TIMELINE.to) - dayNum(TIMELINE.from);
  const pos = (d: string) => `${((dayNum(d) - dayNum(TIMELINE.from)) / span) * 100}%`;
  const months = ["2026-10-01", "2026-11-01", "2026-12-01", "2027-01-01", "2027-02-01"];
  const monthName = ["Okt", "Nov", "Dez", "Jan", "Feb"];
  const tops = MILESTONES.filter((m) => !m.parent);
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-10 px-4 pt-20 pb-10"
      style={{
        backgroundImage: "radial-gradient(var(--line2) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
      }}
    >
      <div className="w-full max-w-[880px] rounded-2xl bg-panel/90 px-5 pt-4 pb-5 shadow-card">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <span className="label-mono">Roadmap · 1.10.2026 – 28.2.2027</span>
          <span className="font-mono text-[12px] text-fg-3 tabular">
            {MILESTONES.length} Meilensteine · noch {daysUntil(EVENT_START)} Tage
          </span>
        </div>
        <div className="relative h-[70px]">
          <div className="absolute inset-x-0 top-7 h-px bg-line-2" />
          {months.map((m, i) => (
            <span key={m} className="absolute top-0 font-mono text-[11px] text-fg-3" style={{ left: pos(m) }}>
              {monthName[i]}
            </span>
          ))}
          {MILESTONES.map((m) => (
            <span
              key={m.id}
              title={`${m.id} ${m.titel} · ${fmt(m.deadline)}`}
              className={cn(
                "absolute top-[23px] size-2.5 -translate-x-1/2 rotate-45 rounded-[2px]",
                m.parent ? "bg-fg-3/60" : "bg-fg"
              )}
              style={{ left: pos(m.deadline) }}
            />
          ))}
          {tops.map((m, i) => (
            <span
              key={`l-${m.id}`}
              className={cn(
                "absolute hidden -translate-x-1/2 font-mono text-[10.5px] text-fg-2 sm:block",
                i % 2 ? "top-[50px]" : "top-[36px]"
              )}
              style={{ left: pos(m.deadline) }}
            >
              {m.id}
            </span>
          ))}
          <div className="absolute top-3 bottom-0 w-[2px] -translate-x-1/2 bg-acc-line" style={{ left: pos(today) }}>
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-acc px-1.5 text-[10px] font-semibold leading-4 text-acc-text">
              heute
            </span>
          </div>
        </div>
      </div>

      <div className="w-full max-w-[360px] rounded-2xl bg-card p-7 shadow-card">
        <div className="mb-6 flex flex-col gap-1">
          <span className="font-display text-[17px]">icons</span>
          <h1 className="mt-3 text-[21px] font-semibold tracking-[-0.025em]">Anmelden</h1>
          <p className="text-fg-2">Steuerung für das Orga-Team.</p>
        </div>
        <FormBody />
      </div>
    </div>
  );
}

// ---------- D · Orga-Pass ----------
function VariantPass({ today }: { today: string }) {
  // „Strichcode“ aus den echten Fristen: Balkenbreite = Abstand zwischen zwei Meilensteinen
  const sorted = [...MILESTONES].sort((a, b) => a.deadline.localeCompare(b.deadline));
  const bars = sorted.map((m, i) => {
    const gap = i === 0 ? 3 : dayNum(m.deadline) - dayNum(sorted[i - 1].deadline);
    return { id: m.id, w: 1 + (gap % 4), done: m.deadline < today };
  });
  return (
    <div className="flex flex-1 items-center justify-center overflow-x-clip px-5 pt-20 pb-10">
      <div className="relative w-full max-w-[380px] -rotate-[1.2deg] rounded-[22px] bg-card shadow-[0_0_0_1px_var(--line),0_20px_50px_rgba(0,0,0,.18)]">
        {/* Lanyard-Loch */}
        <div className="absolute top-3 left-1/2 h-2 w-14 -translate-x-1/2 rounded-full bg-bg shadow-[inset_0_0_0_1px_var(--line2)]" />

        <div className="flex flex-col gap-5 px-7 pt-10 pb-6">
          <div className="flex items-start justify-between">
            <span className="font-display text-[22px] tracking-[0.01em]">icons</span>
            <span className="rounded-full bg-acc px-2.5 py-1 text-[11px] font-semibold tracking-[0.06em] text-acc-text">
              ORGA
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="label-mono">Hackathon-Pass · Invite only</span>
            <span className="text-[30px] leading-tight font-semibold tracking-[-0.03em]">Orga-Team 2027</span>
          </div>
          <dl className="grid grid-cols-3 gap-3 font-mono text-[12px]">
            <div>
              <dt className="text-fg-3">Datum</dt>
              <dd className="text-fg">27.–28.02.</dd>
            </div>
            <div>
              <dt className="text-fg-3">Ort</dt>
              <dd className="text-fg">Wien</dd>
            </div>
            <div>
              <dt className="text-fg-3">Noch</dt>
              <dd className="text-fg tabular">{daysUntil(EVENT_START)} Tage</dd>
            </div>
          </dl>
        </div>

        {/* Perforation mit Kerben */}
        <div className="relative h-0">
          <span className="absolute -top-3 -left-3 size-6 rounded-full bg-bg" />
          <span className="absolute -top-3 -right-3 size-6 rounded-full bg-bg" />
          <div className="mx-5 border-t-2 border-dashed border-line-2" />
        </div>

        <div className="flex flex-col gap-5 px-7 pt-6 pb-7">
          <FormBody />
          <div className="flex items-end justify-between gap-4 pt-1">
            <div className="flex h-9 items-end gap-[3px]" aria-hidden>
              {bars.map((b) => (
                <span
                  key={b.id}
                  className={cn("h-full rounded-[1px]", b.done ? "bg-acc-line" : "bg-fg")}
                  style={{ width: `${b.w}px` }}
                />
              ))}
            </div>
            <span className="font-mono text-[10.5px] text-fg-3">{MILESTONES.length} MS · 5 PLÄTZE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
