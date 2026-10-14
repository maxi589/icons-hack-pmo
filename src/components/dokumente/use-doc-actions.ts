"use client";

import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { useTeam } from "@/components/app-shell/team-provider";
import { logActivity } from "@/lib/data/use-feed";
import { fileUrl, purgeFile, uploadFile, type useDocuments } from "@/lib/data/use-documents";
import { docHref, MAX_FILE_BYTES, NEW_TITLE, normalizeUrl, titleFromUrl, transcriptText, type Doc, type DocPatch } from "@/lib/documents";

// Dokument-Aktionen mit Hinweis + „Rückgängig“ (Dokumente-Seite, Bereichs-Seite, Firmen-Detail, Notizblock).
// `defaults` belegt Bereich und „gehört zu“ vor, je nachdem, woher man kommt.

export type DocDefaults = Pick<DocPatch, "area_id" | "target_type" | "target_id">;

const TRANSCRIPT = /\.(vtt|srt|txt|md)$/i;

export function useDocActions(api: Pick<ReturnType<typeof useDocuments>, "create" | "remove" | "restore">, opts: { onCreated?: (d: Doc) => void } = {}) {
  const router = useRouter();
  const toast = useToast();
  const { me } = useTeam();
  const meId = me?.id ?? null;

  const created = (d: Doc, text: string) => {
    logActivity("document", d.id, meId, "created");
    if (opts.onCreated) opts.onCreated(d);
    toast({ text, actionLabel: opts.onCreated ? undefined : "Öffnen", onAction: opts.onCreated ? undefined : () => router.push(docHref(d.id)) });
  };

  /** Link anlegen. Liefert null, wenn der Text keine Adresse ist. */
  const addLink = async (raw: string, defaults: DocDefaults = {}, title?: string) => {
    const url = normalizeUrl(raw);
    if (!url) return null;
    const d = await api.create({ kind: "link", title: title?.trim() || titleFromUrl(url), url, ...defaults }, meId);
    if (!d) toast({ text: "Hat nicht geklappt. Bitte nochmal versuchen." });
    else created(d, `Link „${d.title}“ abgelegt`);
    return d;
  };

  const addText = async (defaults: DocDefaults = {}, title = NEW_TITLE, content = "", kind: "text" | "transcript" = "text") => {
    const d = await api.create({ kind, title, content, ...defaults }, meId);
    if (!d) toast({ text: "Hat nicht geklappt. Bitte nochmal versuchen." });
    else created(d, `„${d.title}“ angelegt`);
    return d;
  };

  /** Dateien hochladen; Text-Dateien (.vtt/.srt/.txt/.md) werden als Transkript übernommen. */
  const addFiles = async (files: File[], defaults: DocDefaults = {}) => {
    const out: Doc[] = [];
    for (const file of files) {
      const title = file.name.replace(/\.[^.]+$/, "");
      if (TRANSCRIPT.test(file.name) && file.size < 2 * 1024 * 1024) {
        const d = await addText(defaults, title, transcriptText(await file.text(), file.name), "transcript");
        if (d) out.push(d);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        toast({ text: `„${file.name}“ ist größer als 50 MB. Bitte in Drive ablegen und den Link einfügen.` });
        continue;
      }
      toast({ text: `„${file.name}“ wird hochgeladen …` });
      const up = await uploadFile(file);
      if ("error" in up) {
        toast({ text: `„${file.name}“ konnte nicht hochgeladen werden.` });
        continue;
      }
      const d = await api.create({ kind: "file", title, ...up, ...defaults }, meId);
      if (!d) {
        purgeFile(up.file_path);
        toast({ text: "Hat nicht geklappt. Bitte nochmal versuchen." });
        continue;
      }
      created(d, `„${d.title}“ hochgeladen`);
      out.push(d);
    }
    return out;
  };

  const deleteDoc = (d: Doc) => {
    api.remove(d);
    toast({
      text: `„${d.title}“ gelöscht`,
      onAction: () => api.restore(d),
      // Datei erst löschen, wenn „Rückgängig“ abgelaufen ist.
      onExpire: () => d.file_path && purgeFile(d.file_path),
    });
  };

  /** Link bzw. Datei im neuen Tab öffnen. Das Fenster wird sofort geöffnet, sonst blockiert der Browser es. */
  const openDoc = async (d: Doc) => {
    if (d.kind === "link" && d.url) {
      window.open(d.url, "_blank", "noopener,noreferrer");
      return;
    }
    if (d.kind === "file" && d.file_path) {
      const win = window.open("", "_blank");
      const url = await fileUrl(d.file_path);
      if (win && url) win.location.href = url;
      else if (win) win.close();
      if (!url) toast({ text: "Datei konnte nicht geöffnet werden." });
    }
  };

  return { addLink, addText, addFiles, deleteDoc, openDoc };
}
