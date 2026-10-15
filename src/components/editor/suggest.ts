import { Extension, type Editor, type Range } from "@tiptap/core";
import { PluginKey, TextSelection } from "@tiptap/pm/state";
import { isInTable, selectedRect } from "@tiptap/pm/tables";
import Suggestion from "@tiptap/suggestion";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";

// „/“-Menü und „@“-Verknüpfen (Notion light, Stufe A). Die Plugins melden nur, was getippt wird; Liste, Suche und
// Tastatur macht das Menü in React (editor-menu.tsx). Es hängt im Editor selbst, damit ein Tippen hinein kein
// Termin-Sheet schließt.

export type MenuKind = "slash" | "link";

export type MenuState = {
  kind: MenuKind;
  query: string;
  range: Range;
  /** Lage des Cursors (Bildschirm) für die Position des Menüs */
  rect: () => DOMRect | null;
};

export type MenuBridge = {
  /** null = Menü zu */
  onChange: (state: MenuState | null) => void;
  /** true = Taste verbraucht (Pfeile, Enter, Tab) */
  onKeyDown: (event: KeyboardEvent) => boolean;
};

const SLASH_KEY = new PluginKey("slashMenu");
const LINK_KEY = new PluginKey("linkMenu");

/** Ein Plugin je Zeichen. `bridge` ist eine Ref, damit das Editor-Objekt einmal entsteht und trotzdem den aktuellen React-Stand erreicht. */
export function MenuTriggers(bridge: { current: MenuBridge | null }) {
  return Extension.create({
    name: "menuTriggers",
    addProseMirrorPlugins() {
      const make = (kind: MenuKind, char: string, pluginKey: PluginKey) => {
        // Wo zuletzt getippt wurde (Anfang des „/…“ bzw. „@…“); null = geladen oder Menü zu
        let typedAt: number | null = null;
        return Suggestion({
          editor: this.editor,
          pluginKey,
          char,
          allowSpaces: false,
          // Nicht mitten in Wörtern oder Adressen („a/b“, „name@firma.at“)
          allowedPrefixes: [" "],
          // Prüft auch über Formatgrenzen hinweg („**x**/“ ist mitten im Wort).
          allow: ({ state, range }) => {
            const before = state.doc.textBetween(Math.max(range.from - 1, 0), range.from, "\n", "\n");
            return before === "" || /\s/.test(before);
          },
          // Nur durch eigenes Tippen öffnen (und dann offen bleiben). Nicht beim Laden, bei Live-Änderungen anderer oder
          // wenn der Cursor nur hinter ein altes „/“ bzw. „@Tim“ gesetzt wird (sonst fängt das Menü Enter und Pfeile ab).
          shouldShow: ({ transaction, range }) => {
            if (transaction.getMeta("preventUpdate")) typedAt = null;
            else if (transaction.docChanged) typedAt = range.from;
            return typedAt === range.from;
          },
          items: () => [],
          render: () => {
            const report = (p: { query: string; range: Range; clientRect?: (() => DOMRect | null) | null }) =>
              bridge.current?.onChange({ kind, query: p.query, range: p.range, rect: p.clientRect ?? (() => null) });
            return {
              onStart: report,
              onUpdate: report,
              onExit: () => {
                typedAt = null;
                bridge.current?.onChange(null);
              },
              onKeyDown: ({ event }) => {
                // Esc schließt nur das Menü (das Plugin schließt es), nicht das Sheet oder den Dialog drumherum.
                if (event.key === "Escape") {
                  event.stopPropagation();
                  return true;
                }
                return bridge.current?.onKeyDown(event) ?? false;
              },
            };
          },
        });
      };
      return [make("slash", "/", SLASH_KEY), make("link", "@", LINK_KEY)];
    },
  });
}

/**
 * Enter in einer Zelle springt in die Zelle darunter (wie in einer Tabellenkalkulation), in der letzten Zeile mit
 * neuer Zeile. Vorher passierte nichts, weil eine Zelle nur einen Absatz hat. Niedrige Priorität: Ein offenes
 * „/“-Menü bekommt Enter zuerst. Tab/Shift+Tab (nächste/vorige Zelle, in der letzten Zelle neue Zeile) kann Tiptap selbst.
 */
function cellBelow(e: Editor) {
  if (!e.state.selection.empty || !isInTable(e.state)) return false;
  const r = selectedRect(e.state);
  const chain = e.chain();
  if (r.bottom >= r.map.height) chain.addRowAfter();
  return chain
    .command(({ tr, state }) => {
      const s = selectedRect(state);
      const pos = s.tableStart + s.map.map[s.bottom * s.map.width + s.left];
      const cell = state.doc.nodeAt(pos);
      if (!cell) return false;
      tr.setSelection(TextSelection.near(tr.doc.resolve(pos + cell.nodeSize - 1), -1));
      return true;
    })
    .scrollIntoView()
    .run();
}

const TableEnter = Extension.create({
  name: "tableEnter",
  priority: 50,
  addKeyboardShortcuts() {
    return { Enter: () => cellBelow(this.editor) };
  },
});

/**
 * Shift+Enter in einer Zelle wie Enter: Ein Zeilenumbruch in der Zelle käme als wörtliches „<br>“ zurück (gemessen
 * vom Prüfer 15.10.). Muss vor dem Zeilenumbruch von Tiptap (Priorität 100) dran sein, darf aber ein offenes Menü nicht stören.
 */
const TableShiftEnter = Extension.create({
  name: "tableShiftEnter",
  priority: 110,
  addKeyboardShortcuts() {
    return {
      "Shift-Enter": () => {
        const e = this.editor;
        if (!isInTable(e.state)) return false;
        if ([SLASH_KEY, LINK_KEY].some((k) => k.getState(e.state)?.active)) return false;
        // Auch bei markiertem Text nie einen Umbruch einfügen
        return cellBelow(e) || true;
      },
    };
  },
});

/**
 * Tabelle: in Zellen nur Text (eine Zeile), weil Markdown-Tabellen keine Listen oder Absätze speichern können.
 * Am Handy scrollt die Tabelle in sich (Hülle `tableWrapper`).
 */
export const TableBlocks = [
  Table.configure({ renderWrapper: true, resizable: false }),
  TableRow,
  TableHeader.extend({ content: "paragraph" }),
  TableCell.extend({ content: "paragraph" }),
  TableEnter,
  TableShiftEnter,
];
