"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Moon, PanelLeftClose, PanelLeftOpen, Search, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { isActive, NAV_HACKATHON, NAV_MAIN, type NavItem } from "@/lib/nav";
import { useInbox } from "./inbox-provider";
import { toggleSidebar } from "@/lib/sidebar";
import { setTheme } from "@/components/theme-toggle";
import { Kbd } from "@/components/ui/command";
import { usePalette, signOut } from "./command-palette";
import { Avatar } from "@/components/avatar";
import { AreaGlyph } from "@/components/area-glyph";
import { useMilestones } from "@/lib/data/use-milestones";
import { EVENT_NAME } from "@/lib/brand";
import { useTeam } from "./team-provider";

// Desktop-Sidebar (ab 768px). Ausgeklappt 220px, eingeklappt 60px-Icon-Band.
// Der Knopf zum Ein-/Ausklappen sitzt in beiden Zuständen an exakt derselben Stelle oben links (Mitte 30px/32px).
// Beide Varianten stehen im HTML, CSS zeigt die passende (html[data-sidebar=collapsed]),
// damit beim Laden nichts springt. Bewusst ohne Animation (Design-System: keine animierte Sidebar).

const iconBtn =
  "grid size-[30px] place-items-center rounded-lg text-fg-2 transition-colors duration-150 hover:bg-hover hover:text-fg";

function toggleDark() {
  setTheme(document.documentElement.classList.contains("dark") ? "light" : "dark");
}

function ThemeIcon() {
  // Zeigt, wohin umgeschaltet wird: im Dunkeln die Sonne, im Hellen den Mond (wie im Board).
  return (
    <>
      <Sun className="hidden size-4 dark:block" aria-hidden />
      <Moon className="size-4 dark:hidden" aria-hidden />
    </>
  );
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const on = isActive(pathname, item.href);
  const { unread } = useInbox();
  const count = item.href === "/inbox" ? unread : 0;
  return (
    <Link
      href={item.href}
      aria-current={on ? "page" : undefined}
      className={cn(
        "flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] text-fg-2 transition-colors duration-150 hover:bg-hover hover:text-fg",
        on && "bg-active text-fg"
      )}
    >
      <item.Icon className={cn("size-4 shrink-0", on && "text-acc-line")} strokeWidth={1.8} aria-hidden />
      <span className="truncate">{item.label}</span>
      {count > 0 && (
        <span className="ml-auto rounded-full bg-acc px-1.5 text-[11px] leading-[18px] font-semibold text-acc-text tabular">
          {count}
          <span className="sr-only"> ungelesen</span>
        </span>
      )}
    </Link>
  );
}

function RailLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const on = isActive(pathname, item.href);
  const { unread } = useInbox();
  const count = item.href === "/inbox" ? unread : 0;
  return (
    <Link
      href={item.href}
      aria-label={count ? `${item.label}, ${count} ungelesen` : item.label}
      title={item.label}
      aria-current={on ? "page" : undefined}
      className={cn(
        "relative grid size-9 place-items-center rounded-[9px] text-fg-2 transition-colors duration-150 hover:bg-hover hover:text-fg",
        on && "bg-active text-acc-line hover:text-acc-line"
      )}
    >
      <item.Icon className="size-[17px]" strokeWidth={1.8} aria-hidden />
      {count > 0 && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-acc-line shadow-[0_0_0_2px_var(--bg)]" aria-hidden />}
    </Link>
  );
}

const sectionLabel = "label-mono px-2.5 pb-1.5";

/** Anteil erledigter Meilensteine je Bereich (0–1), für den Fortschritts-Ring. */
function useAreaProgress() {
  const { milestones } = useMilestones();
  return (areaId: string) => {
    const own = (milestones ?? []).filter((m) => m.area_id === areaId);
    return own.length ? own.filter((m) => m.status === "erledigt").length / own.length : 0;
  };
}

export function Sidebar() {
  const pathname = usePathname();
  const { me, areas, personById } = useTeam();
  const { open } = usePalette();
  const progress = useAreaProgress();

  return (
    <>
      {/* Ausgeklappt */}
      <nav
        aria-label="Hauptnavigation"
        className="sticky top-0 hidden h-dvh w-[220px] shrink-0 flex-col gap-[18px] overflow-y-auto px-2.5 py-3.5 md:flex md:in-data-[sidebar=collapsed]:hidden"
      >
        <div className="flex h-9 items-center gap-1.5 pl-0.5">
          <button type="button" onClick={toggleSidebar} className={cn(iconBtn, "size-9")} aria-label="Sidebar einklappen" title="Sidebar einklappen">
            <PanelLeftClose className="size-4" strokeWidth={1.8} aria-hidden />
          </button>
          <Link href="/" className="flex items-baseline gap-2.5 rounded-md">
            <span className="font-display text-base tracking-[0.05em]">icons</span>
            <span className="label-mono text-[10px]!">{EVENT_NAME} 27</span>
          </Link>
        </div>

        <button
          type="button"
          onClick={() => open()}
          className="flex h-[34px] w-full items-center justify-between rounded-[9px] px-3 text-[13px] font-medium text-fg-2 shadow-[inset_0_0_0_1px_var(--line2)] transition-[background,color,scale] duration-150 hover:bg-hover hover:text-fg active:scale-[.97]"
        >
          <span className="flex items-center gap-2">
            <Search className="size-[15px]" strokeWidth={1.8} aria-hidden />
            Suchen …
          </span>
          <Kbd>Strg K</Kbd>
        </button>

        <div className="flex flex-col gap-0.5">
          {NAV_MAIN.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </div>

        <div className="flex flex-col gap-0.5">
          <div className={sectionLabel}>Hackathon</div>
          {NAV_HACKATHON.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </div>

        <div className="flex flex-col gap-0.5">
          <div className={sectionLabel}>Bereiche</div>
          {areas.map((a) => {
            const href = `/bereiche/${a.id}`;
            const on = isActive(pathname, href);
            return (
              <Link
                key={a.id}
                href={href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "group flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] text-fg-2 transition-colors duration-150 hover:bg-hover hover:text-fg",
                  on && "bg-active text-fg"
                )}
              >
                <span className="grid w-4 place-items-center">
                  <AreaGlyph color={a.color} progress={progress(a.id)} active={on} />
                </span>
                <span className="flex-1 truncate">{a.name}</span>
                {/* Verantwortliche Person; gestrichelter Kreis = noch niemand */}
                <Avatar person={personById(a.owner_id)} size={18} title={personById(a.owner_id)?.name ?? "Verantwortlich offen"} />
                <span className="sr-only">, {personById(a.owner_id) ? `verantwortlich: ${personById(a.owner_id)!.name}` : "Verantwortlich offen"}</span>
              </Link>
            );
          })}
        </div>

        <div className="mt-auto flex items-center gap-2.5 border-t border-line px-1.5 pt-2">
          <Avatar person={me} />
          <span className="flex-1 truncate text-[13px]">{me?.name}</span>
          <button type="button" onClick={toggleDark} className={iconBtn} aria-label="Hell oder dunkel umschalten" title="Hell/Dunkel">
            <ThemeIcon />
          </button>
          <button type="button" onClick={signOut} className={iconBtn} aria-label="Abmelden" title="Abmelden">
            <LogOut className="size-4" strokeWidth={1.8} aria-hidden />
          </button>
        </div>
      </nav>

      {/* Eingeklappt: 60px-Icon-Band wie im Pipeline-Board */}
      <nav
        aria-label="Hauptnavigation (eingeklappt)"
        className="sticky top-0 hidden h-dvh w-[60px] shrink-0 flex-col items-center gap-1.5 overflow-y-auto px-3 py-3.5 md:in-data-[sidebar=collapsed]:flex"
      >
        <button type="button" onClick={toggleSidebar} className={cn(iconBtn, "mb-1 size-9 shrink-0")} aria-label="Sidebar ausklappen" title="Sidebar ausklappen">
          <PanelLeftOpen className="size-4" strokeWidth={1.8} aria-hidden />
        </button>
        <button type="button" onClick={() => open()} className={cn(iconBtn, "size-9")} aria-label="Suchen (Strg K)" title="Suchen (Strg K)">
          <Search className="size-[17px]" strokeWidth={1.8} aria-hidden />
        </button>
        {[...NAV_MAIN, ...NAV_HACKATHON].map((item) => (
          <RailLink key={item.href} item={item} pathname={pathname} />
        ))}
        <span className="my-1 h-px w-6 shrink-0 bg-line" aria-hidden />
        {areas.map((a) => {
          const href = `/bereiche/${a.id}`;
          const on = isActive(pathname, href);
          return (
            <Link
              key={a.id}
              href={href}
              title={a.name}
              aria-label={a.name}
              aria-current={on ? "page" : undefined}
              className={cn("group grid size-9 shrink-0 place-items-center rounded-[9px] transition-colors duration-150 hover:bg-hover", on && "bg-active")}
            >
              <AreaGlyph color={a.color} progress={progress(a.id)} active={on} size={15} />
            </Link>
          );
        })}
        <div className="mt-auto flex flex-col items-center gap-1.5 border-t border-line pt-2">
          <button type="button" onClick={toggleDark} className={iconBtn} aria-label="Hell oder dunkel umschalten" title="Hell/Dunkel">
            <ThemeIcon />
          </button>
          <button type="button" onClick={signOut} className={iconBtn} aria-label="Abmelden" title="Abmelden">
            <LogOut className="size-4" strokeWidth={1.8} aria-hidden />
          </button>
          <span title={me?.name} className="pt-1">
            <Avatar person={me} />
          </span>
        </div>
      </nav>
    </>
  );
}
