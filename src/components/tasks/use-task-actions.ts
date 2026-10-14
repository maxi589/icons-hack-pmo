"use client";

import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { useTeam } from "@/components/app-shell/team-provider";
import { play } from "@/lib/sounds";
import { logActivity, notifyAssignment } from "@/lib/data/use-feed";
import type { useTasks, TaskPatch } from "@/lib/data/use-tasks";
import { taskStatusName, type Task, type TaskStatus } from "@/lib/tasks";

// Aufgaben-Aktionen mit Hinweis + „Rückgängig“ wie auf der Aufgaben-Seite (für „Für mich“ und Bereichs-Seiten).

export function useTaskActions({ update, create, remove, restore }: Pick<ReturnType<typeof useTasks>, "update" | "create" | "remove" | "restore">) {
  const router = useRouter();
  const toast = useToast();
  const { me } = useTeam();
  const meId = me?.id ?? null;

  /** Status ändern: sofort speichern, 5 s „Rückgängig“, danach Eintrag im Verlauf. */
  const changeStatus = (task: Task, to: TaskStatus) => {
    const from = task.status;
    if (from === to) return;
    update(task.id, { status: to });
    if (to === "erledigt") play("taskDone");
    toast({
      text: to === "erledigt" ? `„${task.title}“ erledigt` : `„${task.title}“ → ${taskStatusName(to)}`,
      onAction: () => update(task.id, { status: from }),
      onExpire: () => logActivity("task", task.id, meId, "status_changed", { from, to }),
    });
  };

  const toggleDone = (task: Task) => changeStatus(task, task.status === "erledigt" ? "offen" : "erledigt");

  const deleteTask = (task: Task) => {
    remove(task);
    toast({ text: `„${task.title}“ gelöscht`, onAction: () => restore(task) });
  };

  /** Neue Aufgabe anlegen (Dialog oder markierter Text). `href` = wohin „Öffnen“ führt. Liefert den Link oder null. */
  const createTask = async (input: TaskPatch & { title: string }, href: (id: string) => string) => {
    const task = await create({ assignee_id: meId, ...input, created_by: meId });
    if (!task) {
      toast({ text: "Hat nicht geklappt. Bitte nochmal versuchen." });
      return null;
    }
    logActivity("task", task.id, meId, "created");
    notifyAssignment("task", task.id, meId, task.assignee_id);
    const link = href(task.id);
    toast({ text: `„${task.title}“ angelegt`, actionLabel: "Öffnen", onAction: () => router.push(link) });
    return link;
  };

  return { changeStatus, toggleDone, deleteTask, createTask };
}
