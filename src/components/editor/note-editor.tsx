"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Placeholder } from "@tiptap/extensions";
import { Markdown } from "@tiptap/markdown";
import { Bold, CircleCheck, FileUp, Heading1, Heading2, Heading3, Italic, Link2, List, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { keepsAllText } from "@/lib/markdown";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast";
import { useTeam } from "@/components/app-shell/team-provider";
import { PERSON_LINK, mentionedIn, notifyMentions, type MentionTarget } from "@/lib/mentions";
import { EditorMenu } from "./editor-menu";
import { MenuTriggers, TableBlocks, type MenuBridge, type MenuState } from "./suggest";
import { TableControls } from "./table-controls";

// Gemeinsamer Editor (Plan Welle 1): Notizblock, Bereichs-Notizen, Termine und Text-Dokumente.
// Gespeichert wird Markdown. Kürzel wie in Notion/Linear: „# “, „- “, „[ ] “, „**fett**“, „> “, „---“.
// Markieren öffnet ein kleines Menü: fett, kursiv, Überschrift, Liste, Checkliste, Link, → Aufgabe.
// „/“ öffnet das Einfügen-Menü (auch Tabelle), „@“ verknüpft Firmen, Aufgaben, Termine, Dokumente, Meilensteine
// (gespeichert als normaler Link, im Editor als Chip). Notion light, Stufe A.
// Mit `mentions` (geteilte Texte) bietet „@“ zuerst das Team an; wer neu getaggt wird, bekommt einen Inbox-Eintrag.

type Props = {
  /** Markdown. Fremde Änderungen werden übernommen, solange man selbst nicht im Feld ist. */
  value: string;
  onChange: (markdown: string) => void;
  onBlur?: () => void;
  label: string;
  placeholder?: string;
  disabled?: boolean;
  /** Markierten Text als Aufgabe anlegen. Liefert den Link zur Aufgabe, der Text wird dann dorthin verlinkt. */
  onCreateTask?: (title: string) => Promise<string | null>;
  /** Markierten Text als Team-Dokument teilen (Markdown der Auswahl, Titel = erste Zeile). */
  onShare?: (markdown: string, title: string) => Promise<string | null>;
  className?: string;
  /** Personen taggen erlaubt: Inbox-Eintrag zeigt auf diesen Eintrag. Ohne (z. B. privater Notizblock) kein Team im „@“-Menü. */
  mentions?: MentionTarget;
};

/** Links auf Einträge im Tool → Tabelle, um vor dem Öffnen zu prüfen, ob es den Eintrag noch gibt. */
const TARGETS: [RegExp, string][] = [
  [/^\/pipeline\?firma=([^&]+)/, "organizations"],
  [/^\/aufgaben\?aufgabe=([^&]+)/, "tasks"],
  [/^\/termine\?termin=([^&]+)/, "meetings"],
  [/^\/dokumente\?dok=([^&]+)/, "documents"],
  [/^\/dokumente\?entscheidung=([^&]+)/, "decisions"],
  [/^\/roadmap\?m=([^&]+)/, "milestones"],
];

/** Neu Getaggte so lange sammeln (ms), bevor die Inbox-Einträge rausgehen */
const SEND_AFTER = 5000;

/** Leere Listen- und Checkbox-Zeilen (Enter am Ende) nicht speichern: Sie kämen sonst als Text „[ ]“ zurück. */
function tidy(md: string) {
  return md.replace(/^[ \t]*[-*+] (\[[ xX]\])?[ \t]*$\n?/gm, "").replace(/\n{3,}/g, "\n\n");
}

type DocJson = { type?: string; text?: string; content?: DocJson[] };

/**
 * Leerzeichen am Anfang eines Absatzes nicht speichern: Markdown kennt sie nicht, und Tiptap 3.31.4 verschluckt nach
 * einer Checkliste dann das erste Zeichen („ Hallo“ → „allo“, gemessen 15.10.); ab vier Leerzeichen würde Code daraus.
 */
function trimBlockStarts(node: DocJson): DocJson {
  if (!node.content) return node;
  let content = node.content.map(trimBlockStarts);
  const first = content[0];
  if ((node.type === "paragraph" || node.type === "heading") && first?.type === "text" && first.text) {
    // \s auch für geschützte und schmale Leerzeichen (z. B. aus Google Docs eingefügt), gemessen vom Prüfer 15.10.
    const text = first.text.replace(/^\s+/, "");
    content = text ? [{ ...first, text }, ...content.slice(1)] : content.slice(1);
  }
  return { ...node, content };
}

/** Markdown zum Speichern (auch für „Teilen“). */
function toMarkdown(editor: Editor, json: DocJson = editor.getJSON()) {
  return tidy(editor.markdown!.serialize(trimBlockStarts(json)));
}

export function NoteEditor({ value, onChange, onBlur, label, placeholder, disabled, onCreateTask, onShare, className, mentions }: Props) {
  const router = useRouter();
  const toast = useToast();
  const { me } = useTeam();
  // Zuletzt gesehener Stand: eigener Text oder übernommener fremder. Verhindert, dass der eigene Stand nach dem Speichern zurückgesetzt wird.
  const last = useRef(value);
  // Schon getaggte Personen (geladener, fremder oder eigener Stand): nur wer neu dazukommt, bekommt einen Inbox-Eintrag.
  // Einmal gemeldet bleibt gemeldet (Löschen und wieder Einfügen meldet nicht doppelt).
  const tagged = useRef(new Set<string>(mentionedIn(value)));
  // Neu Getaggte warten kurz (Prüfer 8.11.): Gemeldet wird beim Verlassen des Felds, nach SEND_AFTER ohne neue
  // Erwähnung oder beim Schließen, und nur, wer dann noch im Text steht. Ein versehentlich gewählter Name, der gleich
  // wieder gelöscht wird, löst so nichts aus.
  const pending = useRef(new Set<string>());
  const sendTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mentionsRef = useRef(mentions);
  const meRef = useRef(me);
  const sendPending = () => {
    if (sendTimer.current) clearTimeout(sendTimer.current);
    sendTimer.current = null;
    const still = new Set(mentionedIn(last.current));
    const ids = [...pending.current].filter((id) => still.has(id) && !tagged.current.has(id));
    pending.current.clear();
    const target = mentionsRef.current;
    const actor = meRef.current;
    if (!ids.length || !target || !actor) return;
    for (const id of ids) tagged.current.add(id);
    notifyMentions(target, actor.id, ids).then((ok) => !ok && toast({ text: "Inbox-Hinweis für die Erwähnung nicht gesendet." }));
  };
  const sendRef = useRef(sendPending);
  // Verlustbremse: Kann der Editor den gespeicherten Text nicht vollständig darstellen, nur lesen (sonst löscht
  // das nächste Speichern, was er nicht kennt, z. B. eine Blockart aus einem neueren App-Stand).
  const [lossy, setLossy] = useState(false);
  const lossyRef = useRef(false);
  /** Gespeicherten Text laden. Ergibt er keinen gültigen Inhalt (z. B. eine Bild-Zeile), stand früher die ganze Seite
   *  (gemessen 15.10.); dann zeigt der Editor den Rohtext nur zum Lesen. */
  const load = (ed: Editor, saved: string) => {
    let valid = true;
    try {
      const json = ed.markdown!.parse(saved);
      // Leerer Text ergibt ein leeres Dokument; das ist erlaubt (Tiptap legt selbst einen leeren Absatz an).
      if (json.content?.length) ed.schema.nodeFromJSON(json).check();
    } catch {
      valid = false;
    }
    if (valid) ed.commands.setContent(saved, { contentType: "markdown", emitUpdate: false });
    else {
      const lines = saved.split("\n").map((line) => (line ? { type: "paragraph", content: [{ type: "text", text: line }] } : { type: "paragraph" }));
      ed.commands.setContent({ type: "doc", content: lines }, { emitUpdate: false });
    }
    for (const id of mentionedIn(saved)) tagged.current.add(id);
    lossyRef.current = !valid || !keepsAllText(saved, ed.getMarkdown());
    setLossy(lossyRef.current);
  };
  // „/“- und „@“-Menü: Die Plugins melden über diese Brücke, React zeichnet das Menü.
  const [menu, setMenu] = useState<MenuState | null>(null);
  const menuKey = useRef<((e: KeyboardEvent) => boolean) | null>(null);
  const [triggers] = useState(() => {
    const bridge: { current: MenuBridge | null } = { current: null };
    bridge.current = { onChange: setMenu, onKeyDown: (e) => menuKey.current?.(e) ?? false };
    return MenuTriggers(bridge);
  });
  const root = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  const onBlurRef = useRef(onBlur);
  useEffect(() => {
    onChangeRef.current = onChange;
    onBlurRef.current = onBlur;
    mentionsRef.current = mentions;
    meRef.current = me;
    sendRef.current = sendPending;
  });
  // Beim Schließen (anderer Termin, Seite verlassen) noch Wartende melden
  useEffect(() => () => sendRef.current(), []);

  const editor = useEditor({
    immediatelyRender: false,
    // Auch hier die Sperre: @tiptap/react setzt die Optionen nach jedem Neuzeichnen neu (sonst wäre „nur lesen“ wieder offen).
    editable: !disabled && !lossy,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        code: { HTMLAttributes: { class: "note-code" } },
        codeBlock: { HTMLAttributes: { class: "note-codeblock" } },
        underline: false,
        link: { openOnClick: false, autolink: true, linkOnPaste: true, defaultProtocol: "https" },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
        a11y: { checkboxLabel: (node, checked) => `${node.textContent || "Leerer Punkt"}, ${checked ? "erledigt" : "offen"}` },
      }),
      ...TableBlocks,
      triggers,
      // Leerer Text: der Platzhalter der Stelle (fest ab dem Anlegen). Sonst in der leeren Zeile mit dem Cursor ein
      // Hinweis auf „/“ bzw. die Überschrift (nur mit Fokus, globals.css).
      Placeholder.configure({
        placeholder: ({ editor: e, node }) => {
          if (node.type.name === "heading") return `Überschrift ${node.attrs.level}`;
          return e.isEmpty ? (placeholder ?? "") : "„/“ für Befehle";
        },
      }),
      Markdown,
    ],
    // Inhalt kommt geprüft in onCreate
    content: "",
    editorProps: {
      attributes: { "aria-label": label, "aria-multiline": "true", role: "textbox", class: "note-editor-content" },
    },
    onCreate: ({ editor }) => load(editor, last.current),
    onUpdate: ({ editor }) => {
      if (lossyRef.current) return;
      const md = toMarkdown(editor);
      // Nur echte Änderungen melden (Tiptap meldet z. B. auch beim Freischalten), sonst würde ungewollt gespeichert.
      // Unterschiede nur in Leerzeilen am Ende (z. B. frisch angelegter Text) zählen nicht.
      if (md.trimEnd() === last.current.trimEnd()) return;
      last.current = md;
      onChangeRef.current(md);
      const fresh = mentionedIn(md).filter((id) => !tagged.current.has(id) && !pending.current.has(id));
      if (!fresh.length) return;
      for (const id of fresh) pending.current.add(id);
      if (sendTimer.current) clearTimeout(sendTimer.current);
      sendTimer.current = setTimeout(sendPending, SEND_AFTER);
    },
    onBlur: ({ event }) => {
      // Wechsel in ein anderes Feld: Menü zu. Ein Tipp ins eigene Menü zählt nicht (falls ein Gerät den Fokus doch abgibt).
      const to = event.relatedTarget as HTMLElement | null;
      if (!to?.closest("[data-editor-menu]")) setMenu(null);
      onBlurRef.current?.();
      if (!to?.closest("[data-editor-menu]")) sendPending();
    },
  });

  // Fremde Änderungen (live) übernehmen, aber nie mitten im eigenen Schreiben.
  useEffect(() => {
    if (!editor || editor.isFocused || value === last.current) return;
    last.current = value;
    load(editor, value);
  }, [editor, value]);

  useEffect(() => {
    editor?.setEditable(!disabled && !lossy, false);
  }, [editor, disabled, lossy]);

  /** Links öffnen per Klick: eigene Seiten im Tool, alles andere im neuen Tab. */
  const onClick = (e: React.MouseEvent) => {
    const a = (e.target as HTMLElement).closest("a");
    const href = a?.getAttribute("href");
    if (!href) return;
    e.preventDefault();
    // Getaggte Person: kein Ziel zum Öffnen
    if (href.startsWith(PERSON_LINK)) return;
    if (!href.startsWith("/")) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }
    const target = TARGETS.map(([re, table]) => [href.match(re)?.[1], table] as const).find(([id]) => id);
    if (!target) return router.push(href);
    // Gelöschte Einträge: Hinweis statt einer leeren Seite. Klappt die Abfrage nicht, trotzdem öffnen.
    const [raw, table] = target;
    let id = raw!;
    try {
      id = decodeURIComponent(id);
    } catch {
      // von Hand geschriebener Link mit „%“: so lassen
    }
    createClient()
      .from(table)
      .select("id")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error }) => (data || error ? router.push(href) : toast({ text: "Eintrag gibt es nicht mehr." })));
  };

  return (
    <div
      ref={root}
      className={cn("note-editor relative", className)}
      onClick={onClick}
      // Mittelklick auf eine getaggte Person würde eine leere Seite öffnen
      onAuxClick={(e) => (e.target as HTMLElement).closest("a")?.getAttribute("href")?.startsWith(PERSON_LINK) && e.preventDefault()}
    >
      {lossy && (
        <div role="status" className="mx-3 mt-3 flex items-center gap-3 rounded-[10px] bg-card-2 px-3 py-2 text-[13px] text-fg-2 max-md:text-[14px]">
          <span className="min-w-0 flex-1">Nicht alles darstellbar, nur lesen.</span>
          <button type="button" onClick={() => window.location.reload()} className="shrink-0 rounded-sm font-medium text-acc-line max-md:min-h-11">
            Neu laden
          </button>
        </div>
      )}
      {editor && <SelectionMenu editor={editor} onCreateTask={onCreateTask} onShare={onShare} />}
      {editor && !disabled && !lossy && <TableControls editor={editor} root={root} />}
      {editor && menu && <EditorMenu editor={editor} state={menu} keyRef={menuKey} people={!!mentions} />}
      <EditorContent editor={editor} />
    </div>
  );
}

// ---------------------------------------------------------------
// Menü beim Markieren
// ---------------------------------------------------------------
const menuBtn =
  "inline-flex size-[30px] items-center justify-center rounded-[7px] text-fg-2 transition-colors duration-150 hover:bg-hover hover:text-fg aria-pressed:bg-active aria-pressed:text-fg max-md:size-10";

function SelectionMenu({ editor, onCreateTask, onShare }: { editor: Editor; onCreateTask?: Props["onCreateTask"]; onShare?: Props["onShare"] }) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const active = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      h1: e.isActive("heading", { level: 1 }),
      heading: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bullet: e.isActive("bulletList"),
      task: e.isActive("taskList"),
      link: e.isActive("link"),
    }),
  });

  const run = (fn: (c: ReturnType<Editor["chain"]>) => ReturnType<Editor["chain"]>) => fn(editor.chain().focus()).run();

  const openLink = () => {
    setUrl(editor.getAttributes("link").href ?? "");
    setLinkOpen(true);
  };
  const applyLink = () => {
    const href = url.trim();
    if (!href) run((c) => c.extendMarkRange("link").unsetLink());
    else run((c) => c.extendMarkRange("link").setLink({ href: /^(https?:|mailto:|\/)/.test(href) ? href : `https://${href}` }));
    setLinkOpen(false);
  };

  const toTask = async () => {
    if (!onCreateTask || busy) return;
    const { from, to } = editor.state.selection;
    const title = editor.state.doc.textBetween(from, to, " ").replace(/\s+/g, " ").trim().slice(0, 200);
    if (!title) return;
    setBusy(true);
    const href = await onCreateTask(title);
    setBusy(false);
    // Text bleibt stehen und zeigt auf die neue Aufgabe.
    if (href) editor.chain().setTextSelection({ from, to }).setLink({ href }).setTextSelection(to).run();
  };

  const share = async () => {
    if (!onShare || busy) return;
    const { from, to } = editor.state.selection;
    const slice = editor.state.selection.content().content.toJSON() as object[];
    const plain = editor.state.doc.textBetween(from, to, "\n");
    const md = toMarkdown(editor, { type: "doc", content: slice });
    const first = plain.split("\n").map((l) => l.trim()).find(Boolean) ?? "";
    if (!md.trim()) return;
    setBusy(true);
    await onShare(md, first.slice(0, 120));
    setBusy(false);
    editor.commands.setTextSelection(to);
  };

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: "top", offset: 8, flip: true }}
      shouldShow={({ editor: e, from, to }) => e.isEditable && from !== to}
      className="z-50 flex items-center gap-0.5 rounded-[10px] bg-card p-1 shadow-[0_0_0_1px_var(--line2),0_12px_32px_rgba(0,0,0,.28)]"
    >
      {linkOpen ? (
        <form
          className="flex items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            applyLink();
          }}
        >
          <label className="sr-only" htmlFor="note-link">
            Link-Adresse
          </label>
          <input
            id="note-link"
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setLinkOpen(false)}
            placeholder="https://…"
            className="h-[30px] w-[220px] rounded-[7px] border border-field bg-card px-2 text-[13px] focus-visible:outline-solid max-md:h-10 max-md:text-base"
          />
          <button type="submit" className="h-[30px] rounded-[7px] bg-acc px-2.5 text-[12.5px] font-medium text-acc-text max-md:h-10">
            OK
          </button>
        </form>
      ) : (
        <>
          <button type="button" className={menuBtn} aria-label="Fett" aria-pressed={active.bold} onClick={() => run((c) => c.toggleBold())}>
            <Bold className="size-[15px]" aria-hidden />
          </button>
          <button type="button" className={menuBtn} aria-label="Kursiv" aria-pressed={active.italic} onClick={() => run((c) => c.toggleItalic())}>
            <Italic className="size-[15px]" aria-hidden />
          </button>
          {/* Am Handy nur eine Überschrift (Platz); H1/H3 gibt es dort über „/“. */}
          <button
            type="button"
            className={cn(menuBtn, "max-md:hidden")}
            aria-label="Überschrift 1"
            aria-pressed={active.h1}
            onClick={() => run((c) => c.toggleHeading({ level: 1 }))}
          >
            <Heading1 className="size-[15px]" aria-hidden />
          </button>
          <button
            type="button"
            className={menuBtn}
            aria-label="Überschrift 2"
            aria-pressed={active.heading}
            onClick={() => run((c) => c.toggleHeading({ level: 2 }))}
          >
            <Heading2 className="size-[15px]" aria-hidden />
          </button>
          <button
            type="button"
            className={cn(menuBtn, "max-md:hidden")}
            aria-label="Überschrift 3"
            aria-pressed={active.h3}
            onClick={() => run((c) => c.toggleHeading({ level: 3 }))}
          >
            <Heading3 className="size-[15px]" aria-hidden />
          </button>
          <button type="button" className={menuBtn} aria-label="Liste" aria-pressed={active.bullet} onClick={() => run((c) => c.toggleBulletList())}>
            <List className="size-[15px]" aria-hidden />
          </button>
          <button type="button" className={menuBtn} aria-label="Checkliste" aria-pressed={active.task} onClick={() => run((c) => c.toggleTaskList())}>
            <ListChecks className="size-[15px]" aria-hidden />
          </button>
          <button type="button" className={menuBtn} aria-label="Link" aria-pressed={active.link} onClick={openLink}>
            <Link2 className="size-[15px]" aria-hidden />
          </button>
          {(onCreateTask || onShare) && <span className="mx-0.5 h-4 w-px bg-line-2" aria-hidden />}
          {onCreateTask && (
            <>
              <button
                type="button"
                onClick={toTask}
                disabled={busy}
                className="inline-flex h-[30px] items-center gap-1.5 rounded-[7px] px-2 text-[12.5px] font-medium text-fg-2 transition-colors duration-150 hover:bg-hover hover:text-fg disabled:opacity-60 max-md:size-10 max-md:justify-center max-md:px-0"
              >
                <CircleCheck className="size-[14px]" aria-hidden />
                <span className="max-md:sr-only">Aufgabe</span>
              </button>
            </>
          )}
          {onShare && (
            <button
              type="button"
              onClick={share}
              disabled={busy}
              className="inline-flex h-[30px] items-center gap-1.5 rounded-[7px] px-2 text-[12.5px] font-medium text-fg-2 transition-colors duration-150 hover:bg-hover hover:text-fg disabled:opacity-60 max-md:size-10 max-md:justify-center max-md:px-0"
            >
              <FileUp className="size-[14px]" aria-hidden />
              <span className="max-md:sr-only">Teilen</span>
            </button>
          )}
        </>
      )}
    </BubbleMenu>
  );
}
