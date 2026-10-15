"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { ChainedCommands, Editor } from "@tiptap/core";
import type { EditorState } from "@tiptap/pm/state";
import { TextSelection } from "@tiptap/pm/state";
import { CellSelection, cellAround, isInTable, selectedRect } from "@tiptap/pm/tables";
import { autoUpdate, computePosition, flip, offset, shift, size } from "@floating-ui/dom";
import {
  BetweenHorizontalEnd,
  BetweenHorizontalStart,
  BetweenVerticalEnd,
  BetweenVerticalStart,
  Columns3,
  Ellipsis,
  Plus,
  Rows3,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/lib/use-is-mobile";
import { useToast } from "@/components/toast";

// Tabellen direkt bearbeiten (Notion light): Steht der Cursor in einer Tabelle (Desktop auch beim Drüberfahren),
// erscheinen „+“ unter der Tabelle (Zeile anhängen) und rechts daneben (Spalte anhängen), dazu ein kleiner Griff
// an der Zelle mit dem Menü Zeile/Spalte einfügen bzw. löschen. Am Handy stattdessen eine Leiste unter der Tabelle
// (Tippflächen 44px). Alles liegt über dem Text (nichts verschiebt sich), der Platz unter der Tabelle ist fest
// reserviert (globals.css). Wie das „/“-Menü hängt alles im Editor und nimmt ihm den Fokus nicht.

/** Lage der Auswahl in der Tabelle (Zeilen/Spalten ab 0, Kopfzeile = 0). */
export type CellInfo = { top: number; bottom: number; left: number; right: number; rows: number; cols: number };

export function cellInfo(state: EditorState): CellInfo | null {
  if (!isInTable(state)) return null;
  const r = selectedRect(state);
  return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, rows: r.map.height, cols: r.map.width };
}

export type TableOp = {
  id: string;
  label: string;
  Icon: LucideIcon;
  /** Suchwörter im „/“-Menü */
  keys: string;
  run: (c: ChainedCommands) => ChainedCommands;
  when?: (i: CellInfo) => boolean;
  /** Löschen: was beim Drüberfahren markiert wird und der Hinweis danach */
  removes?: { what: "row" | "col" | "table"; done: string };
};

// Die Kopfzeile bleibt immer: Markdown-Tabellen haben eine (also nichts darüber einfügen, sie nicht löschen).
// Reihenfolge: das Häufige zuerst (im „/“-Menü wählt Enter die oberste Zeile).
export const TABLE_OPS: TableOp[] = [
  { id: "row", label: "Zeile darunter", Icon: BetweenHorizontalEnd, keys: "zeile einfügen unten row", run: (c) => c.addRowAfter() },
  {
    id: "rowabove",
    label: "Zeile darüber",
    Icon: BetweenHorizontalStart,
    keys: "zeile einfügen oben row",
    run: (c) => c.addRowBefore(),
    when: (i) => i.top > 0,
  },
  { id: "col", label: "Spalte rechts", Icon: BetweenVerticalEnd, keys: "spalte einfügen column", run: (c) => c.addColumnAfter() },
  { id: "colleft", label: "Spalte links", Icon: BetweenVerticalStart, keys: "spalte einfügen column", run: (c) => c.addColumnBefore() },
  {
    id: "delrow",
    label: "Zeile löschen",
    Icon: Rows3,
    keys: "zeile entfernen row",
    run: (c) => c.deleteRow(),
    when: (i) => i.top > 0,
    removes: { what: "row", done: "Zeile gelöscht" },
  },
  {
    id: "delcol",
    label: "Spalte löschen",
    Icon: Columns3,
    keys: "spalte entfernen column",
    run: (c) => c.deleteColumn(),
    // Die letzte Spalte lässt sich nicht löschen (dann „Tabelle löschen“).
    when: (i) => i.right - i.left < i.cols,
    removes: { what: "col", done: "Spalte gelöscht" },
  },
  {
    id: "deltable",
    label: "Tabelle löschen",
    Icon: Trash2,
    keys: "tabelle entfernen table",
    run: (c) => c.deleteTable(),
    removes: { what: "table", done: "Tabelle gelöscht" },
  },
];

/**
 * Nach dem Löschen (Griff- und „/“-Menü): Hinweis mit Rückgängig. Das nimmt nur zurück, solange seitdem nichts
 * geändert wurde und der Editor noch da ist (sonst träfe es das Falsche bzw. das Sheet ist schon zu).
 */
export function offerUndo(editor: Editor, op: TableOp, toast: ReturnType<typeof useToast>) {
  if (!op.removes) return;
  const after = editor.state.doc;
  toast({
    text: op.removes.done,
    actionLabel: "Rückgängig",
    onAction: () => {
      if (!editor.isDestroyed && editor.state.doc.eq(after)) editor.chain().focus().undo().run();
    },
  });
}

/** Zelle mit dem Cursor (bzw. dem Ende einer Zellen-Auswahl) als Position vor der Zelle */
function headCellPos(state: EditorState): number | null {
  const sel = state.selection;
  if (sel instanceof CellSelection) return sel.$headCell.pos;
  return cellAround(sel.$head)?.pos ?? null;
}

type Box = { left: number; top: number; width: number; height: number };

type Geo = {
  wrapper: HTMLElement;
  /** sichtbarer Teil der Tabelle (breite Tabellen scrollen in ihrer Hülle) */
  vis: Box;
  /** Unterkante der Hülle (inkl. einer waagrechten Scrollleiste); darunter liegt der reservierte Platz */
  under: number;
  /** Zelle mit dem Cursor, falls er in dieser Tabelle steht (null, wenn sie seitlich aus dem Bild gescrollt ist) */
  cell: Box | null;
  /** markierte Zeilen bzw. Spalten (bei mehreren markierten Zellen alle), auf den sichtbaren Teil zugeschnitten */
  rows: Box | null;
  cols: Box | null;
  cellPos: number | null;
};

/** Lage der Tabelle mit dem Cursor (sonst der überfahrenen) und ihrer Zelle, relativ zum Editor */
function measureGeo(editor: Editor, el: HTMLElement, hovered: HTMLElement | null): Geo | null {
  if (!editor.isEditable) return null;
  // Bezug ist die Innenkante (absolute Lage rechnet ab dort, z. B. Notizblock mit Rand oben)
  const base = el.getBoundingClientRect();
  const x0 = base.left + el.clientLeft;
  const y0 = base.top + el.clientTop;
  let cellEl: HTMLElement | null = null;
  const cellPos = editor.isFocused ? headCellPos(editor.state) : null;
  if (cellPos !== null) cellEl = (editor.view.nodeDOM(cellPos) as HTMLElement | null) ?? null;
  // Cursor in der Tabelle geht vor dem Drüberfahren
  const wrapper = (cellEl?.closest<HTMLElement>(".tableWrapper") ?? null) || (hovered?.isConnected ? hovered : null);
  const table = wrapper?.querySelector("table");
  if (!wrapper || !table) return null;
  const w = wrapper.getBoundingClientRect();
  const t = table.getBoundingClientRect();
  const left = Math.max(w.left, t.left);
  const right = Math.min(w.right, t.right);
  const vis = { left: left - x0, top: t.top - y0, width: Math.max(right - left, 0), height: t.height };
  const geo: Geo = { wrapper, vis, under: w.bottom - y0, cell: null, rows: null, cols: null, cellPos: null };
  if (!cellEl || !wrapper.contains(cellEl)) return geo;

  geo.cellPos = cellPos;
  const c = cellEl.getBoundingClientRect();
  if (c.right > left && c.left < right) geo.cell = { left: c.left - x0, top: c.top - y0, width: c.width, height: c.height };
  // Markdown-Tabellen haben keine verbundenen Zellen: Zeile i = i-tes <tr>, Spalte j = j-te Zelle der Kopfzeile.
  const sel = cellInfo(editor.state);
  const trs = table.querySelectorAll("tr");
  if (sel && trs[sel.top] && trs[sel.bottom - 1]) {
    const top = trs[sel.top].getBoundingClientRect().top;
    const bottom = trs[sel.bottom - 1].getBoundingClientRect().bottom;
    geo.rows = { left: vis.left, top: top - y0, width: vis.width, height: bottom - top };
    const first = trs[0].children[sel.left]?.getBoundingClientRect();
    const last = trs[0].children[sel.right - 1]?.getBoundingClientRect();
    if (first && last) {
      const l = Math.max(first.left, left);
      const r = Math.min(last.right, right);
      if (r > l) geo.cols = { left: l - x0, top: vis.top, width: r - l, height: vis.height };
    }
  }
  return geo;
}

const BAR = 14;
const GAP = 3;

export function TableControls({ editor, root }: { editor: Editor; root: React.RefObject<HTMLDivElement | null> }) {
  const mobile = useIsMobile();
  const toast = useToast();
  const [geo, setGeo] = useState<Geo | null>(null);
  /** offenes Menü = Zelle, an der es geöffnet wurde */
  const [menuAt, setMenuAt] = useState<number | null>(null);
  const [index, setIndex] = useState(-1);
  const hover = useRef<HTMLElement | null>(null);
  const handle = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const menuId = useId();

  // Neu messen bei jeder Änderung, Größenänderung und beim seitlichen Scrollen einer Tabelle.
  // Desktop: Drüberfahren zeigt die „+“ (Bereich reicht bis zu den Knöpfen, damit sie beim Hinfahren bleiben).
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const measure = () => setGeo(measureGeo(editor, el, hover.current));
    const onBlur = () => {
      setMenuAt(null);
      measure();
    };
    const onMove = (e: MouseEvent) => {
      if (mobile) return;
      let found: HTMLElement | null = null;
      for (const w of el.querySelectorAll<HTMLElement>(".ProseMirror .tableWrapper")) {
        const r = w.getBoundingClientRect();
        const t = w.querySelector("table")?.getBoundingClientRect();
        if (!t) continue;
        const right = Math.min(r.right, t.right) + GAP + BAR + 4;
        if (e.clientX >= r.left - 4 && e.clientX <= right && e.clientY >= t.top - 8 && e.clientY <= r.bottom + GAP + BAR + 4) {
          found = w;
          break;
        }
      }
      if (found !== hover.current) {
        hover.current = found;
        measure();
      }
    };
    const onLeave = () => {
      if (!hover.current) return;
      hover.current = null;
      measure();
    };
    editor.on("transaction", measure);
    editor.on("focus", measure);
    editor.on("blur", onBlur);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    el.addEventListener("scroll", measure, true);
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    window.addEventListener("resize", measure);
    return () => {
      editor.off("transaction", measure);
      editor.off("focus", measure);
      editor.off("blur", onBlur);
      ro.disconnect();
      el.removeEventListener("scroll", measure, true);
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("resize", measure);
    };
  }, [editor, root, mobile]);

  // Menü zu, sobald der Cursor in eine andere Zelle wandert oder die Tabelle weg ist.
  const cellPos = geo?.cellPos ?? null;
  if (menuAt !== null && menuAt !== cellPos) setMenuAt(null);
  const open = menuAt !== null && menuAt === cellPos;

  const info = open ? cellInfo(editor.state) : null;
  const items = info ? TABLE_OPS.filter((op) => !op.when || op.when(info)) : [];
  const active = index >= 0 ? items[index] : undefined;

  const pick = (op: TableOp) => {
    setMenuAt(null);
    if (op.run(editor.chain().focus()).run()) offerUndo(editor, op, toast);
  };

  // Tastatur, solange das Menü offen ist (der Fokus bleibt im Editor): Pfeile, Enter, Esc schließt nur das Menü.
  useEffect(() => {
    const el = root.current;
    if (!open || !el) return;
    const onKey = (e: KeyboardEvent) => {
      const stop = () => {
        e.preventDefault();
        e.stopPropagation();
      };
      if (e.key === "Escape") {
        stop();
        setMenuAt(null);
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        stop();
        const step = e.key === "ArrowDown" ? 1 : -1;
        setIndex((i) => (i < 0 ? (step > 0 ? 0 : items.length - 1) : (i + step + items.length) % items.length));
      } else if (e.key === "Enter" && active) {
        stop();
        pick(active);
      } else {
        setMenuAt(null);
      }
    };
    el.addEventListener("keydown", onKey, true);
    return () => el.removeEventListener("keydown", onKey, true);
  });

  // Screenreader: Das Textfeld zeigt auf den gewählten Menüpunkt (der Fokus bleibt im Editor), wie im „/“-Menü.
  const activeId = open && index >= 0 && index < items.length ? `${menuId}-${index}` : null;
  useEffect(() => {
    if (!open) return;
    const dom = editor.view.dom;
    dom.setAttribute("aria-controls", menuId);
    if (activeId) dom.setAttribute("aria-activedescendant", activeId);
    else dom.removeAttribute("aria-activedescendant");
    return () => {
      dom.removeAttribute("aria-controls");
      dom.removeAttribute("aria-activedescendant");
    };
  }, [open, activeId, menuId, editor]);

  // Desktop: Menü unter der Zelle (Zeile und Spalte bleiben sichtbar, auch die Markierung beim Löschen).
  // Handy: über der Leiste, unten ist die Tastatur.
  useLayoutEffect(() => {
    const el = box.current;
    const cellEl = menuAt !== null ? (editor.view.nodeDOM(menuAt) as HTMLElement | null) : null;
    const ref = mobile ? handle.current : cellEl;
    if (!open || !el || !ref) return;
    let off = false;
    const update = () =>
      computePosition(ref, el, {
        strategy: "absolute",
        placement: mobile ? "top-end" : "bottom-start",
        middleware: [
          offset(6),
          flip({ padding: 8 }),
          shift({ padding: 8 }),
          size({
            padding: 8,
            apply: ({ availableHeight }) => {
              el.style.maxHeight = `${Math.max(160, Math.min(availableHeight, 360))}px`;
            },
          }),
        ],
      }).then(({ x, y }) => {
        if (off) return;
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.visibility = "visible";
      });
    const stop = autoUpdate(ref, el, update);
    return () => {
      off = true;
      stop();
    };
  }, [open, mobile, geo, menuAt, editor]);

  if (!geo) return null;
  const { vis, cell, rows, cols, under } = geo;

  /** Cursor in eine Zelle setzen (Position im DOM), dann die Tabellen-Befehle ausführen */
  const runAt = (target: Element | null | undefined, fn: (c: ChainedCommands) => ChainedCommands) => {
    if (!target) return;
    const pos = editor.view.posAtDOM(target, 0);
    fn(
      editor
        .chain()
        .focus()
        .command(({ tr }) => {
          tr.setSelection(TextSelection.near(tr.doc.resolve(pos)));
          return true;
        }),
    ).run();
  };
  // Neue Zeile am Ende, Cursor in ihre erste Zelle
  const appendRow = () => {
    const rows = geo.wrapper.querySelectorAll("tr");
    runAt(rows[rows.length - 1]?.lastElementChild, (c) => c.addRowAfter().goToNextCell());
  };
  // Neue Spalte rechts, Cursor in ihren Kopf
  const appendCol = () => runAt(geo.wrapper.querySelector("tr")?.lastElementChild, (c) => c.addColumnAfter().goToNextCell());

  // Oberster Punkt vorgewählt (wie im „/“-Menü), damit Enter nie ins Leere geht
  const toggle = () => {
    setIndex(0);
    setMenuAt(open ? null : geo.cellPos);
  };

  // Markierung, was gelöscht würde
  let mark: Box | null = null;
  if (open && active?.removes) {
    if (active.removes.what === "table") mark = vis;
    else mark = active.removes.what === "row" ? rows : cols;
  }

  const keep = (e: React.MouseEvent) => e.preventDefault();
  const quiet = "text-fg-3 transition-colors duration-150 hover:bg-hover hover:text-fg";
  // Die „+“-Leisten liegen schon auf --card2: beim Drüberfahren eine Stufe kräftiger
  const bar = "note-fade absolute z-10 grid place-items-center rounded-[4px] bg-card-2 text-fg-3 transition-colors duration-150 hover:bg-active hover:text-fg";

  return (
    <div data-table-controls="" onMouseDown={keep}>
      {mark && <div aria-hidden className="pointer-events-none absolute z-10 bg-st-red/10 ring-1 ring-st-red/60" style={mark} />}

      {!mobile && (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Zeile anhängen"
            title="Zeile anhängen"
            onClick={appendRow}
            className={bar}
            style={{ left: vis.left, top: under + GAP, width: vis.width, height: BAR }}
          >
            <Plus className="size-3" aria-hidden />
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Spalte anhängen"
            title="Spalte anhängen"
            onClick={appendCol}
            className={bar}
            style={{ left: vis.left + vis.width + GAP, top: vis.top, width: BAR - 2, height: vis.height }}
          >
            <Plus className="size-3" aria-hidden />
          </button>
          {cell && (
            <button
              ref={handle}
              type="button"
              tabIndex={-1}
              aria-label="Zeile und Spalte bearbeiten"
              title="Zeile und Spalte bearbeiten"
              aria-haspopup="menu"
              aria-expanded={open}
              onClick={toggle}
              className={cn(
                "note-fade absolute z-20 grid place-items-center rounded-full bg-card shadow-[0_0_0_1px_var(--line2)]",
                quiet,
                open && "bg-active text-fg",
              )}
              // Mittig auf der oberen Linie der Zelle (verdeckt keinen Text), bei breiten Tabellen im sichtbaren Teil
              style={{
                left: Math.min(Math.max(cell.left + cell.width / 2 - 11, vis.left + 2), vis.left + vis.width - 24),
                top: cell.top - 6,
                width: 22,
                height: 12,
              }}
            >
              <Ellipsis className="size-3" aria-hidden />
            </button>
          )}
        </>
      )}

      {mobile && geo.cellPos !== null && (
        <div className="absolute z-10 flex gap-1" style={{ left: vis.left, top: under + 2 }}>
          <button
            type="button"
            tabIndex={-1}
            onClick={appendRow}
            className={cn("flex h-11 items-center gap-1.5 rounded-[10px] bg-card-2 px-3 text-[14px]", quiet)}
          >
            <Plus className="size-4" aria-hidden />
            Zeile
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={appendCol}
            className={cn("flex h-11 items-center gap-1.5 rounded-[10px] bg-card-2 px-3 text-[14px]", quiet)}
          >
            <Plus className="size-4" aria-hidden />
            Spalte
          </button>
          <button
            ref={handle}
            type="button"
            tabIndex={-1}
            aria-label="Zeile und Spalte bearbeiten"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={toggle}
            className={cn("grid size-11 place-items-center rounded-[10px] bg-card-2", quiet, open && "bg-active text-fg")}
          >
            <Ellipsis className="size-4" aria-hidden />
          </button>
        </div>
      )}

      {open && items.length > 0 && (
        <div
          ref={box}
          id={menuId}
          role="menu"
          aria-label="Tabelle"
          data-editor-menu=""
          className="invisible absolute top-0 left-0 z-50 w-[200px] overflow-y-auto overscroll-contain rounded-[12px] bg-card p-1 shadow-[0_0_0_1px_var(--line2),0_12px_32px_rgba(0,0,0,.28)] max-md:w-[220px]"
        >
          {items.map((op, i) => (
            <div key={op.id}>
              {op.removes && !items[i - 1]?.removes && <div className="mx-1.5 my-1 h-px bg-line" aria-hidden />}
              {op.id === "deltable" && items[i - 1]?.removes && <div className="mx-1.5 my-1 h-px bg-line" aria-hidden />}
              <button
                type="button"
                id={`${menuId}-${i}`}
                role="menuitem"
                tabIndex={-1}
                onMouseMove={() => i !== index && setIndex(i)}
                onMouseLeave={() => setIndex(-1)}
                onClick={() => pick(op)}
                className={cn(
                  "flex h-[34px] w-full items-center gap-2.5 rounded-[8px] px-2.5 text-left text-[13.5px] text-fg max-md:h-11 max-md:text-[15px]",
                  i === index && "bg-active",
                  op.id === "deltable" && "text-st-red",
                )}
              >
                <op.Icon className={cn("size-[15px] shrink-0", op.id === "deltable" ? "text-st-red" : "text-fg-3")} aria-hidden />
                <span className="min-w-0 flex-1 truncate">{op.label}</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
