"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { ChainedCommands, Editor } from "@tiptap/core";
import { autoUpdate, computePosition, flip, offset, shift, size } from "@floating-ui/dom";
import {
  AtSign,
  Building2,
  CalendarDays,
  Circle,
  CircleCheck,
  Flag,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Pilcrow,
  Table,
  TextQuote,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/lib/use-is-mobile";
import { createClient } from "@/lib/supabase/client";
import { DECISION_TYPE, docType } from "@/lib/documents";
import { TARGET_NAMES } from "@/lib/links";
import { personHref } from "@/lib/mentions";
import { useTeam } from "@/components/app-shell/team-provider";
import { matchesAll, searchAll, searchWords, type Hit } from "@/lib/search";
import { type MenuState } from "./suggest";
import { useToast } from "@/components/toast";
import { TABLE_OPS, cellInfo, offerUndo } from "./table-controls";

// Kleines Menü am Cursor: „/“ = Blockarten (in Tabellen: Zeilen/Spalten), „@“ = Verknüpfen mit Firma, Aufgabe,
// Termin, Dokument, Entscheidung oder Meilenstein. Weitertippen filtert, Pfeile + Enter wählen, Esc schließt.
// Gespeichert wird ein normaler Link `[Name](/pipeline?firma=…)`, keine eigene Blockart.

type Row = { id: string; label: string; Icon: LucideIcon; meta?: string; done?: boolean; pick: () => void };

type SlashItem = {
  id: string;
  label: string;
  Icon: LucideIcon;
  /** Suchwörter neben dem Namen */
  keys: string;
  run: (c: ChainedCommands) => ChainedCommands;
  /** nur zeigen, wenn passend */
  when?: (e: Editor) => boolean;
  /** nach dem Ausführen (Löschen: Hinweis mit Rückgängig) */
  done?: () => void;
};

/** Tabellen nur auf oberster Ebene (nicht in Listen oder Zitaten), sonst kann Markdown sie nicht speichern. */
const topLevel = (e: Editor) => e.state.selection.$from.depth === 1;

const BLOCKS: SlashItem[] = [
  { id: "text", label: "Text", Icon: Pilcrow, keys: "absatz normal paragraph", run: (c) => c.setParagraph() },
  { id: "h1", label: "Überschrift 1", Icon: Heading1, keys: "h1 titel heading", run: (c) => c.setHeading({ level: 1 }) },
  { id: "h2", label: "Überschrift 2", Icon: Heading2, keys: "h2 heading", run: (c) => c.setHeading({ level: 2 }) },
  { id: "h3", label: "Überschrift 3", Icon: Heading3, keys: "h3 heading", run: (c) => c.setHeading({ level: 3 }) },
  { id: "ul", label: "Liste", Icon: List, keys: "aufzählung bullet punkte", run: (c) => c.toggleBulletList() },
  { id: "ol", label: "Nummerierte Liste", Icon: ListOrdered, keys: "nummer zahlen ordered 1.", run: (c) => c.toggleOrderedList() },
  { id: "todo", label: "Checkliste", Icon: ListChecks, keys: "todo aufgabe checkbox haken", run: (c) => c.toggleTaskList() },
  { id: "quote", label: "Zitat", Icon: TextQuote, keys: "quote", run: (c) => c.toggleBlockquote() },
  { id: "hr", label: "Trennlinie", Icon: Minus, keys: "linie divider hr strich", run: (c) => c.setHorizontalRule() },
  { id: "table", label: "Tabelle", Icon: Table, keys: "table raster", run: (c) => c.insertTable({ rows: 3, cols: 3, withHeaderRow: true }), when: topLevel },
];

const LINK: SlashItem = { id: "link", label: "Verknüpfen …", Icon: AtSign, keys: "link firma aufgabe termin dokument meilenstein entscheidung @", run: (c) => c.insertContent("@") };

const HIT_ICON: Partial<Record<Hit["type"], LucideIcon>> = { organization: Building2, meeting: CalendarDays, milestone: Flag, decision: DECISION_TYPE.Icon };

function hitIcon(h: Hit): LucideIcon {
  if (h.doc) return docType(h.doc).Icon;
  if (h.type === "task") return h.done ? CircleCheck : Circle;
  return HIT_ICON[h.type] ?? Building2;
}

function matches(item: SlashItem, query: string) {
  const hay = `${item.label} ${item.keys}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .every((w) => hay.includes(w));
}

/** Suche für „@“: ab 2 Zeichen, 150 ms nach dem letzten Tippen. Bereiche nicht (die haben keine eigene Detailseite). */
function useLinkHits(query: string | null) {
  const [found, setFound] = useState<{ q: string; hits: Hit[] }>({ q: "", hits: [] });
  const active = query !== null && query.trim().length >= 2;
  useEffect(() => {
    if (!active) return;
    let stale = false;
    const t = setTimeout(() => {
      const done = (hits: Hit[]) => !stale && setFound({ q: query, hits: hits.filter((h) => h.type !== "area").sort((a, b) => b.score - a.score).slice(0, 8) });
      searchAll(createClient(), query, 4).then(done, () => done([]));
    }, 150);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [query, active]);
  if (!active) return { hits: [] as Hit[], loading: false, short: true };
  // Während neu gesucht wird, nur alte Treffer zeigen, die noch passen (sonst wählt Enter einen veralteten Treffer).
  const loading = found.q !== query;
  const words = searchWords(query);
  return { hits: loading ? found.hits.filter((h) => matchesAll(h.hay, words)) : found.hits, loading, short: false };
}

/** `people`: Team zum Taggen anbieten (nur in geteilten Texten, sonst gäbe es keinen Inbox-Eintrag). */
export function EditorMenu({
  editor,
  state,
  keyRef,
  people = false,
}: {
  editor: Editor;
  state: MenuState;
  keyRef: { current: ((e: KeyboardEvent) => boolean) | null };
  people?: boolean;
}) {
  const team = useTeam();
  const mobile = useIsMobile();
  const toast = useToast();
  const box = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const link = useLinkHits(state.kind === "link" ? state.query : null);

  const chain = () => editor.chain().focus().deleteRange(state.range);

  let rows: Row[];
  if (state.kind === "slash") {
    // In einer Tabelle: Zeilen und Spalten statt Blockarten (Zellen können nur Text), wie im Menü am Zellen-Griff.
    const cell = cellInfo(editor.state);
    const ops = TABLE_OPS.map((op): SlashItem => ({ ...op, when: op.when && (() => op.when!(cell!)), done: () => offerUndo(editor, op, toast) }));
    const list = cell ? [...ops, LINK] : [...BLOCKS, LINK];
    rows = list
      .filter((it) => (!it.when || it.when(editor)) && matches(it, state.query))
      .map((it) => ({ id: it.id, label: it.label, Icon: it.Icon, pick: () => it.run(chain()).run() && it.done?.() }));
  } else {
    // Personen zuerst (schon ab „@“), Namensanfang oder Kürzel passt. Danach Einträge im Tool.
    const q = state.query.trim().toLowerCase();
    const persons: Row[] = people
      ? team.people
          .filter((p) => !q || p.name.toLowerCase().split(" ").some((w) => w.startsWith(q)) || p.initials.toLowerCase() === q)
          .map((p) => ({
            id: `person-${p.id}`,
            label: p.name,
            Icon: UserRound,
            meta: p.id === team.me?.id ? "du" : "Team",
            pick: () =>
              chain()
                .insertContent([
                  { type: "text", text: `@${p.name}`, marks: [{ type: "link", attrs: { href: personHref(p.id) } }] },
                  { type: "text", text: " " },
                ])
                .run(),
          }))
      : [];
    rows = [...persons, ...link.hits.map((h) => ({
      id: `${h.type}-${h.id}`,
      label: h.title,
      Icon: hitIcon(h),
      meta: TARGET_NAMES[h.type as keyof typeof TARGET_NAMES],
      pick: () =>
        chain()
          .insertContent([
            { type: "text", text: h.title || "Ohne Titel", marks: [{ type: "link", attrs: { href: h.href } }] },
            { type: "text", text: " " },
          ])
          .run(),
    }))];
  }
  const ids = rows.map((r) => r.id).join("|");
  const sel = Math.min(index, Math.max(rows.length - 1, 0));

  // Neue Liste → Auswahl oben
  const [lastIds, setLastIds] = useState(ids);
  if (ids !== lastIds) {
    setLastIds(ids);
    setIndex(0);
  }

  // Tastatur kommt aus dem Editor (der Fokus bleibt dort, am Handy bleibt die Tastatur offen).
  // Auswahl zusätzlich in einer Ref, damit schnelle Tasten hintereinander (vor dem Neuzeichnen) stimmen.
  const current = useRef(sel);
  useEffect(() => {
    current.current = sel;
    keyRef.current = (e) => {
      if (!rows.length) return false;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const step = e.key === "ArrowDown" ? 1 : -1;
        current.current = (current.current + step + rows.length) % rows.length;
        setIndex(current.current);
        return true;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        rows[Math.min(current.current, rows.length - 1)].pick();
        return true;
      }
      return false;
    };
    return () => {
      keyRef.current = null;
    };
  });

  // Auswahl im Menü sichtbar halten (nur das Menü scrollen, nicht die Karte oder das Sheet drumherum)
  useEffect(() => {
    const list = box.current;
    const row = list?.querySelector<HTMLElement>(`[data-index="${sel}"]`);
    if (!list || !row) return;
    if (row.offsetTop < list.scrollTop) list.scrollTop = row.offsetTop - 4;
    else if (row.offsetTop + row.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = row.offsetTop + row.offsetHeight - list.clientHeight + 4;
  }, [sel]);

  // Screenreader: Das Textfeld zeigt auf die gewählte Zeile (der Fokus bleibt im Editor).
  const listId = useId();
  const optionId = (i: number) => `${listId}-${i}`;
  const hasRows = rows.length > 0;
  useEffect(() => {
    const dom = editor.view.dom;
    dom.setAttribute("aria-expanded", "true");
    dom.setAttribute("aria-controls", listId);
    if (hasRows) dom.setAttribute("aria-activedescendant", optionId(sel));
    else dom.removeAttribute("aria-activedescendant");
    return () => {
      dom.removeAttribute("aria-expanded");
      dom.removeAttribute("aria-controls");
      dom.removeAttribute("aria-activedescendant");
    };
  });

  // Am Cursor andocken. Am Handy lieber darüber (unten ist die Tastatur), höchstens 5 Zeilen à 44px.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const reference = { getBoundingClientRect: () => state.rect() ?? editor.view.dom.getBoundingClientRect(), contextElement: editor.view.dom };
    let off = false;
    const update = () =>
      computePosition(reference, el, {
        strategy: "absolute",
        placement: mobile ? "top-start" : "bottom-start",
        middleware: [
          offset(6),
          flip({ padding: 8 }),
          shift({ padding: 8 }),
          size({
            padding: 8,
            apply: ({ availableHeight }) => {
              el.style.maxHeight = `${Math.max(132, Math.min(availableHeight, mobile ? 236 : 328))}px`;
            },
          }),
        ],
      }).then(({ x, y }) => {
        if (off) return;
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.visibility = "visible";
      });
    const stop = autoUpdate(reference, el, update);
    return () => {
      off = true;
      stop();
    };
  }, [state, mobile, editor]);

  let empty: string | null = null;
  if (!rows.length) {
    if (state.kind === "slash") empty = "Nichts gefunden.";
    else if (link.short) empty = people ? "Person, Firma, Aufgabe … suchen" : "Firma, Aufgabe, Termin … suchen";
    else empty = link.loading ? "Suche …" : "Nichts gefunden.";
  }

  return (
    <div
      ref={box}
      id={listId}
      role={hasRows ? "listbox" : undefined}
      aria-label={hasRows ? (state.kind === "slash" ? "Einfügen" : "Verknüpfen") : undefined}
      data-editor-menu=""
      data-sound="none"
      // Fokus bleibt im Editor: kein Klick ins Menü nimmt ihn weg (am Handy bleibt die Tastatur offen).
      onMouseDown={(e) => e.preventDefault()}
      className={cn(
        "invisible absolute top-0 left-0 z-50 overflow-y-auto overscroll-contain rounded-[12px] bg-card p-1 shadow-[0_0_0_1px_var(--line2),0_12px_32px_rgba(0,0,0,.28)]",
        state.kind === "slash" ? "w-[232px]" : "w-[300px] max-w-[calc(100vw-32px)]"
      )}
    >
      {empty ? (
        <p role="status" className="px-2.5 py-2 text-[13px] text-fg-3 max-md:text-[14px]">
          {empty}
        </p>
      ) : (
        rows.map((r, i) => (
          <button
            key={r.id}
            type="button"
            id={optionId(i)}
            role="option"
            aria-selected={i === sel}
            data-index={i}
            tabIndex={-1}
            onMouseMove={() => i !== sel && setIndex(i)}
            onClick={r.pick}
            className={cn(
              "flex h-[34px] w-full items-center gap-2.5 rounded-[8px] px-2.5 text-left text-[13.5px] text-fg max-md:h-11 max-md:text-[15px]",
              i === sel && "bg-active"
            )}
          >
            <r.Icon className="size-[15px] shrink-0 text-fg-3" aria-hidden />
            <span className="min-w-0 flex-1 truncate">{r.label}</span>
            {r.meta && <span className="shrink-0 text-[12px] text-fg-3">{r.meta}</span>}
          </button>
        ))
      )}
    </div>
  );
}
