"use client";

import { ChevronDown, Maximize2, Minimize2, Trash2, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { CopyLinkButton } from "@/components/copy-link-button";
import { Feed } from "@/components/feed";
import { EditText } from "@/components/detail-fields";
import { NoteEditor } from "@/components/editor/note-editor";
import { useNotesDraft } from "@/components/editor/notes-card";
import type { Topic } from "@/components/wissen/pickers";
import { docHref, docType, type Doc, type DocPatch } from "@/lib/documents";
import { DocProps } from "./doc-fields";

// Text-Dokument bzw. Transkript: breites Seitenfenster mit dem gemeinsamen Editor (Autospeichern, „… schreibt gerade“),
// Knopf für Vollbild. Eigenschaften und Verlauf darunter eingeklappt, damit der Text im Mittelpunkt steht.

export function DocText({
  doc: d,
  topics,
  full,
  onToggleFull,
  onUpdate,
  onSaveContent,
  onCreateTask,
  onDelete,
  onClose,
}: {
  doc: Doc;
  topics: Topic[];
  /** Vollbild (nur Desktop) */
  full?: boolean;
  onToggleFull?: () => void;
  onUpdate: (patch: DocPatch) => void;
  onSaveContent: (markdown: string) => Promise<boolean>;
  onCreateTask?: (title: string) => Promise<string | null>;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [propsOpen, setPropsOpen] = useState(false);
  const t = docType(d);
  const draft = useNotesDraft({
    data: { notes: d.content, updatedAt: d.updated_at, updatedBy: d.updated_by },
    save: onSaveContent,
    presenceKey: `doc-${d.id}`,
  });

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex items-center gap-2 px-[18px] pt-3.5 pb-1">
        <span className="inline-flex items-center gap-1.5 text-[12px] text-fg-3">
          <t.Icon className="size-3.5" aria-hidden />
          {t.label}
        </span>
        <span className={cn("ml-auto truncate text-[12px] text-fg-3 tabular", draft.error && "text-st-red")} aria-live="polite">
          {draft.meta}
        </span>
        {onToggleFull && (
          <button
            type="button"
            onClick={onToggleFull}
            className="grid size-8 shrink-0 place-items-center rounded-lg text-fg-3 hover:bg-hover hover:text-fg"
            aria-label={full ? "Vollbild verlassen" : "Vollbild"}
          >
            {full ? <Minimize2 className="size-3.5" aria-hidden /> : <Maximize2 className="size-3.5" aria-hidden />}
          </button>
        )}
        <CopyLinkButton path={docHref(d.id)} label="Link zu diesem Dokument kopieren" />
        <button
          type="button"
          onClick={onClose}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-fg-3 hover:bg-hover hover:text-fg max-md:size-11"
          aria-label="Detail schließen"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <div className={cn("mx-auto flex w-full flex-1 flex-col", full && "max-w-[820px]")}>
        <h2 className="px-[10px] pt-1">
          <span className="sr-only">Titel</span>
          <EditText
            id={`doc-${d.id}-title`}
            value={d.title}
            placeholder="Titel"
            required
            wrap
            onSave={(v) => v && onUpdate({ title: v })}
            className="text-[22px] leading-tight font-semibold tracking-[-0.02em] md:text-[22px]"
          />
        </h2>

        <NoteEditor
          value={draft.value}
          label={d.title}
          placeholder={d.kind === "transcript" ? "Transkript einfügen …" : "Schreiben …"}
          onChange={draft.onChange}
          onBlur={draft.onBlur}
          onCreateTask={onCreateTask}
          mentions={{ type: "document", id: d.id }}
          className="flex min-h-[300px] flex-1 flex-col [&_.ProseMirror]:px-[18px]"
        />

        <div className="border-t border-line px-[18px]">
          <button
            type="button"
            aria-expanded={propsOpen}
            onClick={() => setPropsOpen((v) => !v)}
            className="flex min-h-10 w-full items-center gap-2 text-[12.5px] font-medium text-fg-2 hover:text-fg max-md:min-h-11"
          >
            Eigenschaften & Verlauf
            <ChevronDown className={cn("size-3.5 text-fg-3 transition-transform duration-200", propsOpen && "rotate-180")} aria-hidden />
          </button>
          {propsOpen && (
            <div className="flex flex-col pb-6">
              <DocProps doc={d} topics={topics} onUpdate={onUpdate} />
              <div className="flex justify-end pt-1 pb-3">
                <button
                  type="button"
                  onClick={onDelete}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] text-fg-3 transition-colors duration-150 hover:bg-hover hover:text-st-red max-md:min-h-11"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  Löschen
                </button>
              </div>
              <Feed targetType="document" targetId={d.id} describe={(a) => (a.action === "created" ? "hat das Dokument angelegt" : a.action)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
