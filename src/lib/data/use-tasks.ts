"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Task } from "@/lib/tasks";

// Alle Aufgaben mit Live-Updates. Änderungen erscheinen sofort (optimistisch) und werden bei Fehler
// zurückgenommen. Versionszähler wie in use-organizations.ts: eine ältere Antwort überschreibt keine eigene Änderung.

const FIELDS = "id, title, description, status, assignee_id, due_date, area_id, milestone_id, meeting_id, organization_id, done_at, created_by, created_at";

export type TaskPatch = Partial<Omit<Task, "id" | "created_at">>;

export function useTasks() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const version = useRef(0);
  const pending = useRef(0);
  // Viele Ereignisse auf einmal (z. B. 5 Standard-Aufgaben anlegen und gleich wieder entfernen) lösen mehrere
  // Neuladevorgänge aus; nur die Antwort des letzten zählt, sonst stünden kurz Aufgaben da, die es nicht mehr gibt.
  const seq = useRef(0);

  const load = useCallback(async () => {
    const v = version.current;
    const n = ++seq.current;
    const { data } = await createClient().from("tasks").select(FIELDS).order("created_at");
    if (data && n === seq.current && pending.current === 0 && v === version.current) setTasks(data as Task[]);
  }, []);

  useEffect(() => {
    load();
    // Ereignisse kurz sammeln: 5 Standard-Aufgaben auf einmal lösten sonst 5 gleichzeitige Abfragen aus, die zusammen
    // bis 2,4 s brauchten (gemessen 16.10.); so ist es eine.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(load, 120);
    };
    const supabase = createClient();
    const channel = supabase
      .channel(`tasks-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, schedule)
      .subscribe();
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [load]);

  /** Speichert eine Änderung. Status „erledigt“ setzt bzw. löscht den Zeitpunkt automatisch. */
  const update = useCallback(async (id: string, patch: TaskPatch) => {
    const full: TaskPatch = { ...patch };
    if (patch.status) full.done_at = patch.status === "erledigt" ? new Date().toISOString() : null;
    let before: Task | undefined;
    setTasks((list) =>
      list?.map((t) => {
        if (t.id !== id) return t;
        before = t;
        return { ...t, ...full };
      }) ?? null
    );
    version.current++;
    pending.current++;
    const { error } = await createClient().from("tasks").update(full).eq("id", id);
    pending.current--;
    if (error && before) {
      const restore = before;
      setTasks((list) => list?.map((t) => (t.id === id ? restore : t)) ?? null);
    }
    return !error;
  }, []);

  const create = useCallback(async (input: TaskPatch & { title: string; created_by: string | null }) => {
    const { data, error } = await createClient().from("tasks").insert(input).select(FIELDS).single();
    if (error || !data) return null;
    version.current++;
    setTasks((list) => [...(list ?? []).filter((t) => t.id !== data.id), data as Task]);
    return data as Task;
  }, []);

  /** Löschen; mit `restore` lässt es sich rückgängig machen (gleiche ID, Kommentare bleiben verknüpft). */
  const remove = useCallback(async (task: Task) => {
    version.current++;
    setTasks((list) => list?.filter((t) => t.id !== task.id) ?? null);
    const { error } = await createClient().from("tasks").delete().eq("id", task.id);
    if (error) setTasks((list) => [...(list ?? []), task]);
    return !error;
  }, []);

  const restore = useCallback(async (task: Task) => {
    version.current++;
    setTasks((list) => [...(list ?? []).filter((t) => t.id !== task.id), task]);
    await createClient().from("tasks").insert(task);
  }, []);

  return { tasks, update, create, remove, restore };
}
