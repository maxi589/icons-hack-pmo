"use client";

import { Download, ExternalLink, Trash2, X } from "lucide-react";
import { CopyLinkButton } from "@/components/copy-link-button";
import { Feed } from "@/components/feed";
import { EditText, PropRow } from "@/components/detail-fields";
import type { Topic } from "@/components/wissen/pickers";
import { fileUrl } from "@/lib/data/use-documents";
import { docHref, docType, formatSize, normalizeUrl, type Doc, type DocPatch } from "@/lib/documents";
import { DocProps } from "./doc-fields";

// Link oder Datei im Detail (rechts 400px; am Handy als Bottom Sheet): „Öffnen ↗“, Titel, Adresse bzw. Datei,
// Bereich, gehört zu, Verlauf mit Kommentaren. Alles speichert sofort bzw. beim Verlassen.

export function DocDetail({
  doc: d,
  topics,
  onUpdate,
  onOpen,
  onDelete,
  onClose,
}: {
  doc: Doc;
  topics: Topic[];
  onUpdate: (patch: DocPatch) => void;
  onOpen: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const t = docType(d);
  const f = (name: string) => `doc-${d.id}-${name}`;

  const download = async () => {
    if (!d.file_path) return;
    const url = await fileUrl(d.file_path, true);
    if (url) window.location.href = url;
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-start gap-2 border-b border-line px-[18px] pt-4 pb-3.5">
        <span className="mt-1 grid size-[26px] shrink-0 place-items-center rounded-md bg-active text-fg-2" aria-hidden>
          <t.Icon className="size-3.5" />
        </span>
        <h2 className="min-w-0 flex-1">
          <span className="sr-only">Titel</span>
          <EditText
            id={f("title")}
            value={d.title}
            placeholder="Titel"
            required
            wrap
            onSave={(v) => v && onUpdate({ title: v })}
            className="text-base font-semibold tracking-[-0.01em] md:text-base"
          />
        </h2>
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

      <div className="flex gap-2 border-b border-line px-[18px] py-3">
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-[9px] bg-acc px-3.5 text-[13.5px] font-medium text-acc-text transition-[scale] duration-150 active:scale-[.97] max-md:h-11"
        >
          Öffnen
          <ExternalLink className="size-3.5" aria-hidden />
        </button>
        {d.kind === "file" && (
          <button
            type="button"
            onClick={download}
            className="inline-flex h-9 items-center gap-1.5 rounded-[9px] px-3 text-[13px] font-medium text-fg-2 shadow-[inset_0_0_0_1px_var(--line2)] hover:bg-hover hover:text-fg max-md:h-11"
          >
            <Download className="size-3.5" aria-hidden />
            Herunterladen
          </button>
        )}
      </div>

      <div className="flex flex-col border-b border-line px-[18px] py-2.5">
        <PropRow label="Art">
          <span className="block px-2 leading-8 text-fg-2">
            {t.label}
            {d.kind === "file" && d.file_size ? ` · ${formatSize(d.file_size)}` : ""}
          </span>
        </PropRow>
        {d.kind === "link" ? (
          <PropRow label="Adresse" htmlFor={f("url")}>
            <EditText
              id={f("url")}
              value={d.url}
              placeholder="https://…"
              required
              onSave={(v) => {
                const url = v && normalizeUrl(v);
                if (url) onUpdate({ url });
              }}
            />
          </PropRow>
        ) : (
          <PropRow label="Datei">
            <span className="block truncate px-2 leading-8 text-fg-2" title={d.file_name ?? undefined}>
              {d.file_name}
            </span>
          </PropRow>
        )}
        <DocProps doc={d} topics={topics} onUpdate={onUpdate} />
        <div className="flex justify-end pt-1 pb-1">
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] text-fg-3 transition-colors duration-150 hover:bg-hover hover:text-st-red max-md:min-h-11"
          >
            <Trash2 className="size-3.5" aria-hidden />
            Löschen
          </button>
        </div>
      </div>

      <div className="px-[18px] pt-3.5 pb-6">
        <Feed targetType="document" targetId={d.id} describe={(a) => (a.action === "created" ? "hat das Dokument abgelegt" : a.action)} />
      </div>
    </div>
  );
}
