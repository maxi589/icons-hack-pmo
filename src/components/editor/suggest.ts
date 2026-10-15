import { Extension, type Editor, type Range } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
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
 * Tabelle: in Zellen nur Text (eine Zeile), weil Markdown-Tabellen keine Listen oder Absätze speichern können.
 * Am Handy scrollt die Tabelle in sich (Hülle `tableWrapper`).
 */
export const TableBlocks = [
  Table.configure({ renderWrapper: true, resizable: false }),
  TableRow,
  TableHeader.extend({ content: "paragraph" }),
  TableCell.extend({ content: "paragraph" }),
];

export const inTable = (editor: Editor) => editor.isActive("table");
