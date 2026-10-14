"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Placeholder } from "@tiptap/extensions";
import { Markdown } from "@tiptap/markdown";
import { Bold, CircleCheck, FileUp, Heading2, Italic, Link2, List, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";

// Gemeinsamer Editor (Plan Welle 1): Notizblock, Bereichs-Notizen, später Termine und Text-Dokumente.
// Gespeichert wird Markdown. Kürzel wie in Notion/Linear: „# “, „- “, „[ ] “, „**fett**“, „> “, „---“.
// Markieren öffnet ein kleines Menü: fett, kursiv, Überschrift, Liste, Checkliste, Link, → Aufgabe.

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
};

/** Leere Listen- und Checkbox-Zeilen (Enter am Ende) nicht speichern: Sie kämen sonst als Text „[ ]“ zurück. */
function tidy(md: string) {
  return md.replace(/^[ \t]*[-*+] (\[[ xX]\])?[ \t]*$\n?/gm, "").replace(/\n{3,}/g, "\n\n");
}

export function NoteEditor({ value, onChange, onBlur, label, placeholder, disabled, onCreateTask, onShare, className }: Props) {
  const router = useRouter();
  // Zuletzt gesehener Stand: eigener Text oder übernommener fremder. Verhindert, dass der eigene Stand nach dem Speichern zurückgesetzt wird.
  const last = useRef(value);
  const onChangeRef = useRef(onChange);
  const onBlurRef = useRef(onBlur);
  useEffect(() => {
    onChangeRef.current = onChange;
    onBlurRef.current = onBlur;
  });

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        code: false,
        codeBlock: false,
        underline: false,
        link: { openOnClick: false, autolink: true, linkOnPaste: true, defaultProtocol: "https" },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
        a11y: { checkboxLabel: (node, checked) => `${node.textContent || "Leerer Punkt"}, ${checked ? "erledigt" : "offen"}` },
      }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
      Markdown,
    ],
    content: value,
    contentType: "markdown",
    editorProps: {
      attributes: { "aria-label": label, "aria-multiline": "true", role: "textbox", class: "note-editor-content" },
    },
    onUpdate: ({ editor }) => {
      const md = tidy(editor.getMarkdown());
      // Nur echte Änderungen melden (Tiptap meldet z. B. auch beim Freischalten), sonst würde ungewollt gespeichert.
      if (md === last.current) return;
      last.current = md;
      onChangeRef.current(md);
    },
    onBlur: () => onBlurRef.current?.(),
  });

  // Fremde Änderungen (live) übernehmen, aber nie mitten im eigenen Schreiben.
  useEffect(() => {
    if (!editor || editor.isFocused || value === last.current) return;
    last.current = value;
    editor.commands.setContent(value, { contentType: "markdown", emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    editor?.setEditable(!disabled, false);
  }, [editor, disabled]);

  /** Links öffnen per Klick: eigene Seiten im Tool, alles andere im neuen Tab. */
  const onClick = (e: React.MouseEvent) => {
    const a = (e.target as HTMLElement).closest("a");
    const href = a?.getAttribute("href");
    if (!href) return;
    e.preventDefault();
    if (href.startsWith("/")) router.push(href);
    else window.open(href, "_blank", "noopener,noreferrer");
  };

  return (
    <div className={cn("note-editor relative", className)} onClick={onClick}>
      {editor && <SelectionMenu editor={editor} onCreateTask={onCreateTask} onShare={onShare} />}
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
      heading: e.isActive("heading", { level: 2 }),
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
    const md = tidy(editor.markdown?.serialize({ type: "doc", content: slice }) ?? plain);
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
          <button
            type="button"
            className={menuBtn}
            aria-label="Überschrift"
            aria-pressed={active.heading}
            onClick={() => run((c) => c.toggleHeading({ level: 2 }))}
          >
            <Heading2 className="size-[15px]" aria-hidden />
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
                className="inline-flex h-[30px] items-center gap-1.5 rounded-[7px] px-2 text-[12.5px] font-medium text-fg-2 transition-colors duration-150 hover:bg-hover hover:text-fg disabled:opacity-60 max-md:h-10 max-md:text-[14px]"
              >
                <CircleCheck className="size-[14px]" aria-hidden />
                Aufgabe
              </button>
            </>
          )}
          {onShare && (
            <button
              type="button"
              onClick={share}
              disabled={busy}
              className="inline-flex h-[30px] items-center gap-1.5 rounded-[7px] px-2 text-[12.5px] font-medium text-fg-2 transition-colors duration-150 hover:bg-hover hover:text-fg disabled:opacity-60 max-md:h-10 max-md:text-[14px]"
            >
              <FileUp className="size-[14px]" aria-hidden />
              Teilen
            </button>
          )}
        </>
      )}
    </BubbleMenu>
  );
}
