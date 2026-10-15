"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { defaultFilter } from "cmdk";
import {
  Building2,
  CalendarDays,
  Check,
  Circle,
  CircleCheck,
  Flag,
  LogOut,
  MessageSquare,
  Monitor,
  Moon,
  PanelLeft,
  Plus,
  Sun,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { openFeedback } from "@/components/feedback/feedback-panel";
import { openProfile } from "./profile-dialog";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
  Kbd,
} from "@/components/ui/command";
import { setTheme, useThemeChoice } from "@/components/theme-toggle";
import { useTeam } from "./team-provider";
import { NAV_ALL, NEW_ACTIONS } from "@/lib/nav";
import { toggleSidebar } from "@/lib/sidebar";
import { play } from "@/lib/sounds";
import { createClient } from "@/lib/supabase/client";
import { DECISION_TYPE, docType } from "@/lib/documents";
import { matchesAll, searchAll, searchWords, type Hit, type HitType } from "@/lib/search";

// Befehlsleiste (Strg+K) plus Tastenkürzel: G dann Buchstabe = Gehe zu, C/F/E = Neu anlegen.
// Ab zwei Zeichen sucht sie zusätzlich in allen Inhalten (lib/search.ts); ein Treffer öffnet das Detail.

type Mode = "all" | "new";
const PaletteContext = createContext<{ open: (mode?: Mode) => void }>({ open: () => {} });

export function usePalette() {
  return useContext(PaletteContext);
}

export async function signOut() {
  await fetch("/auth/signout", { method: "POST" });
  // Voll neu laden, damit keine Daten der Sitzung im Speicher bleiben.
  window.location.replace("/login");
}

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
}

export function CommandProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<{ open: boolean; mode: Mode }>({ open: false, mode: "all" });
  const gPressed = useRef(0);

  const open = useCallback((mode: Mode = "all") => setState({ open: true, mode }), []);

  // Ton beim Öffnen und Schließen, egal ob per Strg+K, Klick oder Esc.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current !== state.open) play(state.open ? "paletteOpen" : "paletteClose");
    wasOpen.current = state.open;
  }, [state.open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setState((s) => ({ open: !s.open, mode: "all" }));
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target) || document.querySelector("[role=dialog]")) return;
      const key = e.key.toUpperCase();
      if (Date.now() - gPressed.current < 1000) {
        gPressed.current = 0;
        const item = NAV_ALL.find((n) => n.key === key);
        if (item) router.push(item.href);
        return;
      }
      if (key === "G") {
        gPressed.current = Date.now();
        return;
      }
      const action = NEW_ACTIONS.find((a) => a.key === key);
      if (action) router.push(action.href);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <PaletteContext value={{ open }}>
      {children}
      <CommandDialog open={state.open} onOpenChange={(o) => setState((s) => ({ ...s, open: o }))}>
        <Palette mode={state.mode} close={() => setState((s) => ({ ...s, open: false }))} />
      </CommandDialog>
    </PaletteContext>
  );
}

function Palette({ mode, close }: { mode: Mode; close: () => void }) {
  const router = useRouter();
  const { areas } = useTeam();
  const theme = useThemeChoice();
  const [search, setSearch] = useState("");
  const [found, setFound] = useState<{ q: string; hits: Hit[] }>({ q: "", hits: [] });

  // Inhalte erst ab zwei Zeichen und 150 ms Tipp-Pause suchen. Alte Treffer bleiben stehen, bis neue da sind;
  // was nicht mehr passt, filtert `filterItem` sofort weg.
  const words = searchWords(search);
  const active = mode === "all" && words.join("").length >= 2;
  const hits = active ? found.hits : [];
  const searching = active && found.q !== search;
  useEffect(() => {
    if (!active) return;
    let stale = false;
    const t = setTimeout(() => {
      const done = (list: Hit[]) => !stale && setFound({ q: search, hits: list });
      searchAll(createClient(), search).then(done, () => done([]));
    }, 150);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [search, active]);

  // cmdk sortiert hier nicht um, die Reihenfolge im Code gilt: passende Seiten und Bereiche oben, dann die
  // Inhalts-Gruppen nach ihrem besten Treffer, dann Darstellung, Sonstiges, Aktionen.
  const hitGroups = HIT_GROUPS.map(({ heading, types }) => ({ heading, list: hits.filter((h) => types.includes(h.type)) }))
    .filter((g) => g.list.length > 0)
    .sort((a, b) => b.list[0].score - a.list[0].score);

  // Kommen neue Treffer, steht die Auswahl wieder auf dem obersten Eintrag (Enter öffnet ihn).
  const [selected, setSelected] = useState("");
  useEffect(() => {
    const t = setTimeout(() => {
      const first = document.querySelector<HTMLElement>("[cmdk-list] [cmdk-item]");
      if (first?.dataset.value) setSelected(first.dataset.value);
    }, 0);
    return () => clearTimeout(t);
  }, [found]);

  const run = (fn: () => void) => () => {
    close();
    fn();
  };
  const go = (href: string) => run(() => router.push(href));
  const hitItem = (h: Hit) => <HitItem key={`${h.type}-${h.id}`} hit={h} words={words} onSelect={go(h.href)} />;

  // Beim Suchen stehen Seiten vor den Aktionen, damit „pipe“ + Enter die Pipeline öffnet.
  const actions = (
    <CommandGroup heading="Aktionen">
      {NEW_ACTIONS.map((a) => (
        <CommandItem key={a.href} value={a.label} onSelect={go(a.href)}>
          <Plus aria-hidden />
          <span className="flex-1">{a.label}</span>
          <CommandShortcut keys={[a.key]} />
        </CommandItem>
      ))}
    </CommandGroup>
  );

  return (
    <Command loop filter={filterItem} value={selected} onValueChange={setSelected}>
      <CommandInput
        placeholder={mode === "new" ? "Was willst du anlegen?" : "Suchen oder Befehl …"}
        aria-label="Befehl oder Suche"
        value={search}
        onValueChange={setSearch}
      >
        <button type="button" onClick={close} className="cursor-pointer" aria-label="Schließen">
          <Kbd>Esc</Kbd>
        </button>
      </CommandInput>
      <CommandList>
        <CommandEmpty>{searching ? "Suche …" : "Nichts gefunden."}</CommandEmpty>
        {!search && actions}
        {mode === "all" && (
          <>
            <CommandGroup heading="Gehe zu">
              {NAV_ALL.map(({ href, label, Icon, key }) => (
                <CommandItem key={href} value={label} onSelect={go(href)}>
                  <Icon aria-hidden />
                  <span className="flex-1">{label}</span>
                  <CommandShortcut keys={["G", key]} />
                </CommandItem>
              ))}
            </CommandGroup>
            {areas.length > 0 && (
              <CommandGroup heading="Bereiche">
                {areas.map((a) => (
                  <CommandItem key={a.id} value={`Bereich ${a.name}`} onSelect={go(`/bereiche/${a.id}`)}>
                    <span className="mx-[3px] size-2 rounded-full" style={{ background: a.color }} aria-hidden />
                    <span className="flex-1">{a.name}</span>
                  </CommandItem>
                ))}
                {hits.filter((h) => h.type === "area").map(hitItem)}
              </CommandGroup>
            )}
            {hitGroups.map(({ heading, list }) => (
              <CommandGroup key={heading} heading={heading}>
                {list.map(hitItem)}
              </CommandGroup>
            ))}
            <CommandGroup heading="Darstellung">
              {(
                [
                  ["light", "Hell", Sun],
                  ["dark", "Dunkel", Moon],
                  ["system", "System", Monitor],
                ] as const
              ).map(([value, label, Icon]) => (
                <CommandItem key={value} value={`Darstellung ${label}`} onSelect={run(() => setTheme(value))}>
                  <Icon aria-hidden />
                  <span className="flex-1">{label}</span>
                  {theme === value && <Check className="text-acc-line" aria-label="aktiv" />}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Sonstiges">
              <CommandItem value="Sidebar ein- oder ausklappen" onSelect={run(toggleSidebar)} className="max-md:hidden">
                <PanelLeft aria-hidden />
                <span className="flex-1">Sidebar ein- oder ausklappen</span>
              </CommandItem>
              <CommandItem value="Profil Passwort ändern Team einladen" onSelect={run(openProfile)}>
                <UserRound aria-hidden />
                <span className="flex-1">Profil &amp; Team</span>
              </CommandItem>
              <CommandItem value="Feedback geben Fehler Idee melden" onSelect={run(() => openFeedback(250))}>
                <MessageSquare aria-hidden />
                <span className="flex-1">Feedback geben</span>
              </CommandItem>
              <CommandItem value="Abmelden" onSelect={run(signOut)}>
                <LogOut aria-hidden />
                <span className="flex-1">Abmelden</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}
        {search && actions}
      </CommandList>
    </Command>
  );
}

// Treffer aus den Inhalten. Bereichs-Notizen stehen in der Gruppe „Bereiche“.
const HIT_GROUPS: { heading: string; types: HitType[] }[] = [
  { heading: "Firmen", types: ["organization"] },
  { heading: "Aufgaben", types: ["task"] },
  { heading: "Termine", types: ["meeting"] },
  { heading: "Dokumente", types: ["document", "decision"] },
  { heading: "Meilensteine", types: ["milestone"] },
];

/** Treffer tragen ihre Punktzahl im value („hit|0.6|…“) und ihren Text in keywords. Bei Befehlen und Seiten
 *  fallen ab 3 Zeichen verstreute Zufallstreffer weg (gemessen: „pipe“ → „Profil … einladen“ 0,14, Wortanfang ≥ 0,89). */
function filterItem(value: string, search: string, keywords?: string[]) {
  if (!value.startsWith("hit|")) {
    const score = defaultFilter(value, search, keywords);
    return search.trim().length >= 3 && score < 0.5 ? 0 : score;
  }
  return matchesAll(keywords?.[0] ?? "", searchWords(search)) ? Number(value.split("|")[1]) : 0;
}

function hitIcon(h: Hit): LucideIcon {
  if (h.doc) return docType(h.doc).Icon;
  if (h.type === "decision") return DECISION_TYPE.Icon;
  if (h.type === "task") return h.done ? CircleCheck : Circle;
  if (h.type === "meeting") return CalendarDays;
  if (h.type === "milestone") return Flag;
  return Building2;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Fundstellen in der Textzeile etwas kräftiger. */
function Marked({ text, words }: { text: string; words: string[] }) {
  const parts = text.split(new RegExp(`(${words.map(escapeRe).join("|")})`, "gi"));
  return parts.map((p, i) =>
    i % 2 ? (
      <mark key={i} className="bg-transparent font-medium text-fg-2">
        {p}
      </mark>
    ) : (
      p
    )
  );
}

function HitItem({ hit, words, onSelect }: { hit: Hit; words: string[]; onSelect: () => void }) {
  const { areaById } = useTeam();
  const icon = { Icon: hitIcon(hit) };
  return (
    <CommandItem
      value={`hit|${hit.score}|${hit.type}|${hit.id}`}
      keywords={[hit.hay]}
      onSelect={onSelect}
      className={hit.snippet ? "h-auto min-h-[38px] items-start py-[7px]" : undefined}
    >
      {hit.type === "area" ? (
        <span className="mx-[3px] mt-[6px] size-2 shrink-0 rounded-full" style={{ background: areaById(hit.id)?.color }} aria-hidden />
      ) : (
        <icon.Icon aria-hidden className={hit.snippet ? "mt-[3px]" : undefined} />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate">{hit.title}</span>
        {hit.snippet && (
          <span className="block truncate text-[12.5px] text-fg-3">
            <Marked text={hit.snippet} words={words} />
          </span>
        )}
      </span>
      {hit.meta && <span className="shrink-0 text-[12px] text-fg-3 tabular">{hit.meta}</span>}
    </CommandItem>
  );
}
