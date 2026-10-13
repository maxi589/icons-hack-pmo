"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LogOut, Monitor, Moon, PanelLeft, Plus, Sun } from "lucide-react";
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

// Befehlsleiste (Strg+K) plus Tastenkürzel: G dann Buchstabe = Gehe zu, C/F/E = Neu anlegen.

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

  const run = (fn: () => void) => () => {
    close();
    fn();
  };
  const go = (href: string) => run(() => router.push(href));

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
    <Command loop>
      <CommandInput
        placeholder={mode === "new" ? "Was willst du anlegen?" : "Befehl, Seite, Bereich …"}
        aria-label="Befehl oder Suche"
        value={search}
        onValueChange={setSearch}
      >
        <button type="button" onClick={close} className="cursor-pointer" aria-label="Schließen">
          <Kbd>Esc</Kbd>
        </button>
      </CommandInput>
      <CommandList>
        <CommandEmpty>Nichts gefunden.</CommandEmpty>
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
              </CommandGroup>
            )}
            <CommandGroup heading="Darstellung">
              {(
                [
                  ["light", "Hell", Sun],
                  ["dark", "Dunkel", Moon],
                  ["system", "Wie das Gerät (System)", Monitor],
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
