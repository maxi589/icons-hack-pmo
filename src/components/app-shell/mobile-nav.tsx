"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, House, Inbox, Kanban, List, LogOut, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { isActive, NAV_HACKATHON, NAV_MAIN, NEW_ACTIONS } from "@/lib/nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Avatar } from "./sidebar";
import { signOut, usePalette } from "./command-palette";
import { useTeam } from "./team-provider";

// Handy (unter 768px): Kopfzeile mit Logo, Datum und Avatar (öffnet das Menü),
// unten die Tab-Leiste Heute · Pipeline · + · Aufgaben · Inbox. Tippflächen mind. 44px.

const dateFmt = new Intl.DateTimeFormat("de-AT", {
  timeZone: "Europe/Vienna",
  weekday: "short",
  day: "numeric",
  month: "long",
});

// Datum erst im Browser, damit „heute“ immer stimmt (der Server baut die Seite vorab).
const noop = () => () => {};
function useToday() {
  return useSyncExternalStore(noop, () => dateFmt.format(new Date()).replace(".,", ","), () => "");
}

const sheetRow =
  "flex min-h-12 w-full items-center gap-3 rounded-xl px-3.5 text-left text-[15px] text-fg transition-colors duration-150 active:bg-active";

export function MobileHeader() {
  const { me } = useTeam();
  const [menu, setMenu] = useState(false);
  const { open } = usePalette();
  const today = useToday();

  return (
    <header className="flex items-center justify-between px-[18px] pt-[max(12px,env(safe-area-inset-top))] pb-2 md:hidden">
      <Link href="/" className="flex min-h-11 items-center font-display text-[15px] tracking-[0.05em]">
        icons
      </Link>
      <div className="flex items-center gap-1">
        <span className="text-[13px] text-fg-2">
          {today}
        </span>
        <button type="button" onClick={() => open()} className="grid size-11 place-items-center text-fg-2" aria-label="Suchen">
          <Search className="size-[18px]" strokeWidth={1.8} aria-hidden />
        </button>
        <button type="button" onClick={() => setMenu(true)} className="-mr-2 grid size-11 place-items-center" aria-label="Menü öffnen">
          <Avatar person={me} />
        </button>
      </div>
      <MenuSheet open={menu} onOpenChange={setMenu} />
    </header>
  );
}

function MenuSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { me, areas } = useTeam();
  const pathname = usePathname();
  const close = () => onOpenChange(false);
  // Was nicht in der Tab-Leiste steht, ist hier erreichbar.
  const links = [...NAV_MAIN, ...NAV_HACKATHON].filter((n) => !["/", "/inbox", "/pipeline", "/aufgaben"].includes(n.href));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[88dvh] gap-3 overflow-y-auto px-3.5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))]">
        <div className="mx-auto h-1 w-9 shrink-0 rounded-full bg-line-2" aria-hidden />
        <div className="flex items-center gap-3 px-1 pt-1 pr-12">
          <Avatar person={me} size={36} />
          <SheetTitle className="text-[17px] font-semibold">{me?.name ?? "Menü"}</SheetTitle>
        </div>

        <div className="flex flex-col">
          {links.map(({ href, label, Icon }) => (
            <Link key={href} href={href} onClick={close} className={cn(sheetRow, isActive(pathname, href) && "bg-active")}>
              <Icon className="size-5 text-fg-2" strokeWidth={1.8} aria-hidden />
              <span className="flex-1">{label}</span>
              <ChevronRight className="size-4 text-fg-3" aria-hidden />
            </Link>
          ))}
        </div>

        {areas.length > 0 && (
          <div className="flex flex-col">
            <div className="label-mono px-3.5 pb-1">Bereiche</div>
            {areas.map((a) => (
              <Link key={a.id} href={`/bereiche/${a.id}`} onClick={close} className={sheetRow}>
                <span className="mx-1.5 size-2.5 rounded-full" style={{ background: a.color }} aria-hidden />
                <span className="flex-1">{a.name}</span>
                {!a.owner_id && <span className="text-[13px] text-st-amber">Verantwortlich offen</span>}
              </Link>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <div className="label-mono px-3.5">Darstellung</div>
          <ThemeToggle size="lg" className="flex w-full" />
        </div>

        <button type="button" onClick={signOut} className={cn(sheetRow, "text-fg-2")}>
          <LogOut className="size-5" strokeWidth={1.8} aria-hidden />
          Abmelden
        </button>
      </SheetContent>
    </Sheet>
  );
}

const TABS = [
  { href: "/", label: "Heute", Icon: House },
  { href: "/pipeline", label: "Pipeline", Icon: Kanban },
  null, // Platz für „+“
  { href: "/aufgaben", label: "Aufgaben", Icon: List },
  { href: "/inbox", label: "Inbox", Icon: Inbox },
];

export function MobileTabBar() {
  const pathname = usePathname();
  const [newOpen, setNewOpen] = useState(false);

  return (
    <>
      <nav
        aria-label="Tab-Leiste"
        className="fixed inset-x-0 bottom-0 z-40 flex items-center bg-panel px-2 pt-1.5 pb-[max(8px,env(safe-area-inset-bottom))] shadow-[0_-1px_0_var(--line)] md:hidden"
      >
        {TABS.map((tab) =>
          tab ? (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive(pathname, tab.href) ? "page" : undefined}
              className={cn(
                "flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 text-[10.5px] text-fg-3",
                isActive(pathname, tab.href) && "text-fg"
              )}
            >
              <tab.Icon className="size-5" strokeWidth={1.8} aria-hidden />
              {tab.label}
            </Link>
          ) : (
            <button
              key="neu"
              type="button"
              onClick={() => setNewOpen(true)}
              aria-label="Neu anlegen"
              className="mx-1.5 grid size-[52px] shrink-0 place-items-center rounded-full bg-acc text-acc-text transition-transform duration-150 active:scale-[.97]"
            >
              <Plus className="size-[22px]" strokeWidth={2.4} aria-hidden />
            </button>
          )
        )}
      </nav>

      <Sheet open={newOpen} onOpenChange={setNewOpen}>
        <SheetContent side="bottom" className="gap-2 px-3.5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))]">
          <div className="mx-auto h-1 w-9 rounded-full bg-line-2" aria-hidden />
          <SheetTitle className="px-1 pt-1 text-[17px] font-semibold">Neu anlegen</SheetTitle>
          <div className="flex flex-col">
            {NEW_ACTIONS.map((a) => (
              <Link key={a.href} href={a.href} onClick={() => setNewOpen(false)} className={sheetRow}>
                <Plus className="size-5 text-fg-2" strokeWidth={2} aria-hidden />
                {a.label}
              </Link>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
