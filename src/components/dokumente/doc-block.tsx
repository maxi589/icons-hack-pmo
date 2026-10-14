"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, FileText, Link2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDocuments } from "@/lib/data/use-documents";
import { docHref, docType, type Doc } from "@/lib/documents";
import { useDocActions, type DocDefaults } from "./use-doc-actions";

// Block „Dokumente“ dort, wo man arbeitet (Bereichs-Seite, Firmen-Detail, Termin als „Unterlagen“).
// Bereich bzw. „gehört zu“ sind vorbelegt. Link einfügen + Enter, „Text“, „Datei“ oder Datei hineinziehen.

export function DocBlock({
  defaults,
  match,
  variant = "card",
  title = "Dokumente",
}: {
  defaults: DocDefaults;
  /** Welche Dokumente hierher gehören */
  match: (d: Doc) => boolean;
  /** card = eigene Karte (Bereich), plain = Abschnitt im Detail-Panel (Firma) */
  variant?: "card" | "plain";
  title?: string;
}) {
  const router = useRouter();
  const api = useDocuments();
  const actions = useDocActions(api);
  const [url, setUrl] = useState("");
  const [error, setError] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  if (api.docs === false) return null;
  const list = (api.docs ?? []).filter(match);

  const submit = async () => {
    if (!url.trim()) return;
    const d = await actions.addLink(url, defaults);
    setError(!d);
    if (d) setUrl("");
  };

  const smallBtn =
    "inline-flex h-8 items-center gap-1.5 rounded-[9px] px-2.5 text-[12.5px] font-medium text-fg-2 shadow-[inset_0_0_0_1px_var(--line2)] transition-colors duration-150 hover:bg-hover hover:text-fg max-md:h-10";

  return (
    <section
      aria-label={title}
      className={cn("relative min-w-0", variant === "card" ? "overflow-hidden rounded-[14px] bg-card shadow-card" : "")}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setDragging(false)}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        setDragging(false);
        actions.addFiles([...e.dataTransfer.files], defaults);
      }}
    >
      <div className={cn("flex items-center justify-between gap-2", variant === "card" ? "px-4 pt-4 pb-3" : "pb-2")}>
        <h2 className={cn("flex items-center gap-2 font-semibold", variant === "card" ? "text-[14px]" : "text-[13px]")}>
          {title}
          {list.length > 0 && <span className="font-normal text-fg-3 tabular">{list.length}</span>}
        </h2>
        <span className="flex gap-1.5">
          <button
            type="button"
            className={smallBtn}
            onClick={async () => {
              const d = await actions.addText(defaults);
              if (d) router.push(docHref(d.id));
            }}
          >
            <FileText className="size-3.5" aria-hidden />
            Text
          </button>
          <button type="button" className={smallBtn} onClick={() => fileInput.current?.click()}>
            <Upload className="size-3.5" aria-hidden />
            Datei
          </button>
        </span>
      </div>

      {list.length > 0 && (
        <ul className={cn(variant === "card" ? "border-t border-line" : "overflow-hidden rounded-[10px] shadow-[0_0_0_1px_var(--line)]")}>
          {list.map((d) => {
            const t = docType(d);
            return (
              <li key={d.id} className="relative flex min-h-11 items-center gap-2.5 border-t border-line px-3.5 first:border-t-0 hover:bg-hover max-md:min-h-12">
                <t.Icon className="size-3.5 shrink-0 text-fg-3" aria-hidden />
                <Link href={docHref(d.id)} className="min-w-0 flex-1 truncate rounded-sm text-[13.5px] after:absolute after:inset-0 max-md:text-[15px]">
                  {d.title}
                </Link>
                <span className="shrink-0 text-[12px] text-fg-3">{t.label}</span>
                {(d.kind === "link" || d.kind === "file") && (
                  <button
                    type="button"
                    onClick={() => actions.openDoc(d)}
                    className="relative z-[1] grid size-8 shrink-0 place-items-center rounded-lg text-fg-3 hover:bg-active hover:text-fg max-md:size-10"
                    aria-label={`„${d.title}“ öffnen`}
                  >
                    <ExternalLink className="size-3.5" aria-hidden />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <form
        className={cn("flex flex-col gap-1", variant === "card" ? "border-t border-line px-4 py-3" : "pt-2")}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="relative flex items-center">
          <span className="sr-only">Link ablegen</span>
          <Link2 className="pointer-events-none absolute left-2.5 size-3.5 text-fg-3" aria-hidden />
          <input
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError(false);
            }}
            onPaste={(e) => {
              // Einfügen legt sofort ab, wie auf der Dokumente-Seite.
              const text = e.clipboardData.getData("text/plain");
              if (!url && text.trim()) {
                e.preventDefault();
                actions.addLink(text, defaults).then((d) => {
                  if (!d) {
                    setUrl(text);
                    setError(true);
                  }
                });
              }
            }}
            placeholder="Link einfügen oder Datei hierher ziehen"
            aria-invalid={error || undefined}
            className="h-9 w-full rounded-[9px] border border-dashed border-field bg-transparent pr-2.5 pl-8 text-[13px] text-fg placeholder:text-fg-3 focus-visible:border-solid focus-visible:outline-solid max-md:h-11 max-md:text-base"
          />
        </label>
        {error && (
          <span role="alert" className="text-[12px] text-st-red">
            Das ist keine Adresse.
          </span>
        )}
      </form>

      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-[inherit] border-2 border-dashed border-acc-line bg-card/90 text-[13.5px] font-medium">
          Datei hier ablegen
        </div>
      )}
      <input
        ref={fileInput}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = "";
          if (files.length) actions.addFiles(files, defaults);
        }}
      />
    </section>
  );
}
