"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Doc, DocPatch } from "@/lib/documents";

// Dokumente (Tabelle documents, Speicher „dokumente“). Live; Änderungen erscheinen sofort und werden bei Fehler zurückgenommen.
// Wie in use-organizations.ts: Ein Versionszähler verhindert, dass eine ältere Antwort eine eigene Änderung überschreibt.

const FIELDS =
  "id, kind, title, url, file_path, file_name, file_size, mime, content, area_id, target_type, target_id, created_by, created_at, updated_by, updated_at";
const BUCKET = "dokumente";

const byUpdated = (a: Doc, b: Doc) => b.updated_at.localeCompare(a.updated_at);

export function useDocuments() {
  /** null = lädt, false = Tabelle fehlt bzw. Fehler */
  const [docs, setDocs] = useState<Doc[] | null | false>(null);
  const version = useRef(0);
  const pending = useRef(0);

  const load = useCallback(async () => {
    const v = version.current;
    const { data, error } = await createClient().from("documents").select(FIELDS).order("updated_at", { ascending: false });
    if (pending.current || v !== version.current) return;
    setDocs(error ? false : (data as Doc[]));
  }, []);

  useEffect(() => {
    load();
    const supabase = createClient();
    const channel = supabase
      .channel(`documents-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "documents" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const update = useCallback(async (id: string, patch: DocPatch, by: string | null) => {
    const full = { ...patch, updated_by: by, updated_at: new Date().toISOString() };
    let before: Doc | undefined;
    setDocs((list) =>
      list
        ? list
            .map((d) => {
              if (d.id !== id) return d;
              before = d;
              return { ...d, ...full };
            })
            .sort(byUpdated)
        : list
    );
    version.current++;
    pending.current++;
    const { error } = await createClient().from("documents").update(full).eq("id", id);
    pending.current--;
    if (error && before) {
      const restore = before;
      setDocs((list) => (list ? list.map((d) => (d.id === id ? restore : d)) : list));
    }
    return !error;
  }, []);

  const create = useCallback(async (input: DocPatch & { kind: Doc["kind"]; title: string }, by: string | null) => {
    const { data, error } = await createClient()
      .from("documents")
      .insert({ ...input, created_by: by, updated_by: by })
      .select(FIELDS)
      .single();
    if (error || !data) return null;
    version.current++;
    setDocs((list) => [data as Doc, ...(list || []).filter((d) => d.id !== data.id)]);
    return data as Doc;
  }, []);

  /** Löschen: Zeile sofort weg; die Datei erst, wenn „Rückgängig“ abgelaufen ist (`purgeFile`). */
  const remove = useCallback(
    async (doc: Doc) => {
      version.current++;
      setDocs((list) => (list ? list.filter((d) => d.id !== doc.id) : list));
      const { error } = await createClient().from("documents").delete().eq("id", doc.id);
      if (error) load();
    },
    [load]
  );

  const restore = useCallback(
    async (doc: Doc) => {
      version.current++;
      await createClient().from("documents").insert(doc);
      load();
    },
    [load]
  );

  return { docs, update, create, remove, restore };
}

/** Datei hochladen. Liefert Pfad und Eckdaten für das Dokument oder einen Fehlertext. */
export async function uploadFile(file: File): Promise<{ file_path: string; file_name: string; file_size: number; mime: string } | { error: string }> {
  const safe = file.name.normalize("NFKD").replace(/[^\w.\- ]+/g, "").replace(/\s+/g, "-") || "datei";
  const path = `${crypto.randomUUID()}/${safe}`;
  const { error } = await createClient().storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) return { error: error.message };
  return { file_path: path, file_name: file.name, file_size: file.size, mime: file.type || "application/octet-stream" };
}

/** Datei öffnen: kurzlebiger Link (nur fürs angemeldete Team gültig, 5 min). */
export async function fileUrl(path: string, download = false) {
  const { data } = await createClient().storage.from(BUCKET).createSignedUrl(path, 300, download ? { download: true } : undefined);
  return data?.signedUrl ?? null;
}

export async function purgeFile(path: string) {
  await createClient().storage.from(BUCKET).remove([path]);
}
