"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { MobileSheet } from "@/components/mobile-sheet";
import { PageHeader } from "@/components/app-shell/page-header";
import { useTeam } from "@/components/app-shell/team-provider";
import { NotesCard } from "@/components/editor/notes-card";
import { useDocActions } from "@/components/dokumente/use-doc-actions";
import { NewTaskDialog } from "@/components/tasks/new-task-dialog";
import { TaskDetail } from "@/components/tasks/task-detail";
import { TaskList, TaskOrgs } from "@/components/tasks/tasks";
import { useTaskActions } from "@/components/tasks/use-task-actions";
import { useToday } from "@/lib/use-today";
import { useIsMobile } from "@/lib/use-is-mobile";
import { useMilestones } from "@/lib/data/use-milestones";
import { useNotepad } from "@/lib/data/use-notepad";
import { useDocuments } from "@/lib/data/use-documents";
import { docHref } from "@/lib/documents";
import { useTasks, type TaskPatch } from "@/lib/data/use-tasks";
import { useOrganizations } from "@/lib/data/use-organizations";

// „Für mich“ (Plan Welle 1, ersetzt „Meine Aufgaben“): Aufbau wie die Bereichs-Seite.
// Oben die eigenen Aufgaben nach Fälligkeit, darunter der private Notizblock über die ganze Breite (Maxi, 15.10.:
// „wie Notion, über die ganze Breite, Aufgaben darüber“).
// Detail rechts über die volle Höhe (wie auf der Aufgaben-Seite). Adresse: ?aufgabe=<id>, ?neu=1.

const TITLE = "Für mich";

export function FuerMich() {
  const today = useToday();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const isMobile = useIsMobile();
  const { me } = useTeam();
  const tasksApi = useTasks();
  const { tasks, update } = tasksApi;
  const { changeStatus, toggleDone, deleteTask, createTask } = useTaskActions(tasksApi);
  const { milestones } = useMilestones();
  const { orgs } = useOrganizations();
  const notepad = useNotepad(me?.id);
  const docActions = useDocActions(useDocuments());
  const [showDone, setShowDone] = useState(false);

  const selectedId = params.get("aufgabe");
  const newOpen = params.get("neu") === "1";

  const setParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const toggle = (id: string) => setParams({ aufgabe: id === selectedId ? null : id });
  const close = () => setParams({ aufgabe: null });
  const here = (id: string) => `/fuer-mich?aufgabe=${id}`;

  if (!tasks || !milestones || !today || !me) {
    return (
      <>
        <PageHeader title={TITLE} />
        <div className="mx-auto grid w-full max-w-[1440px] gap-4 px-3.5 pt-2 md:gap-5 md:px-8 md:pt-8" aria-busy="true" aria-label={`${TITLE} lädt`}>
          <div className="h-[120px] rounded-[14px] bg-card-2" />
          <div className="h-[460px] rounded-[14px] bg-card-2" />
        </div>
      </>
    );
  }

  // Eigene Aufgaben; eine eben abgegebene bleibt sichtbar, solange ihr Detail offen ist.
  const mine = tasks.filter((t) => t.assignee_id === me.id || t.id === selectedId);
  const selected = tasks.find((t) => t.id === selectedId) ?? null;
  const openCount = mine.filter((t) => t.status !== "erledigt").length;

  const detail = selected && (
    <TaskDetail
      key={selected.id}
      task={selected}
      today={today}
      milestones={milestones}
      orgs={orgs ?? []}
      onUpdate={(p: TaskPatch) => update(selected.id, p)}
      onStatus={(to) => changeStatus(selected, to)}
      onDelete={() => {
        close();
        deleteTask(selected);
      }}
      onClose={close}
    />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title={TITLE} action={{ label: "Aufgabe", onClick: () => setParams({ neu: "1" }) }} />
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 md:overflow-y-auto">
          <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-3.5 pt-2 pb-8 md:gap-5 md:px-8 md:pt-8 md:pb-12">
            <h1 className="pb-1 text-[20px] font-semibold tracking-[-0.025em] md:sr-only">{TITLE}</h1>
            <div className="flex flex-col gap-4 md:gap-6">
              <section aria-labelledby="mine-title" className="flex min-w-0 flex-col gap-3">
                <div className="flex min-h-8 items-center justify-between gap-2 px-1">
                  <h2 id="mine-title" className="flex items-center gap-2 text-[14px] font-semibold">
                    Meine Aufgaben
                    {openCount > 0 && <span className="font-normal text-fg-3 tabular">{openCount} offen</span>}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setParams({ neu: "1" })}
                    className="inline-flex h-10 items-center rounded-[9px] px-2.5 text-[13px] font-medium text-fg-2 shadow-[inset_0_0_0_1px_var(--line2)] transition-[background,color,scale] duration-150 hover:bg-hover hover:text-fg active:scale-[.97] md:hidden"
                  >
                    + Aufgabe
                  </button>
                </div>
                {openCount === 0 && (
                  <p className="rounded-[14px] bg-card-2 px-4 py-6 text-[13.5px] text-fg-2 max-md:bg-card max-md:shadow-card">Dir ist gerade nichts zugewiesen.</p>
                )}
                <TaskOrgs value={orgs}>
                <TaskList
                  className=""
                  tasks={mine}
                  milestones={milestones}
                  today={today}
                  byDue
                  showDone={showDone}
                  onShowDone={() => setShowDone((v) => !v)}
                  selectedId={selectedId}
                  onOpen={toggle}
                  onToggle={toggleDone}
                />
                </TaskOrgs>
              </section>
              <NotesCard
                title="Notizblock"
                label="Notizblock, nur für dich"
                private
                data={notepad.data}
                save={notepad.save}
                placeholder="Gedanken, Ideen, To-dos …"
                onCreateTask={(title) => createTask({ title }, here)}
                onShare={async (markdown, title) => {
                  const d = await docActions.addText({}, title || "Aus dem Notizblock", markdown);
                  return d ? docHref(d.id) : null;
                }}
              />
            </div>
          </div>
        </div>

        {selected && !isMobile && (
          <aside data-detail aria-label="Aufgaben-Detail" className="w-[400px] shrink-0 overflow-y-auto border-l border-line bg-card">
            {detail}
          </aside>
        )}
      </div>

      <MobileSheet open={!!selected && isMobile} onClose={close} title={selected?.title ?? ""}>
        {detail}
      </MobileSheet>

      <NewTaskDialog
        open={newOpen}
        onOpenChange={(o) => !o && setParams({ neu: null })}
        milestones={milestones}
        defaults={{ assignee_id: me.id }}
        onCreate={async (input) => {
          const link = await createTask(input, here);
          if (link) setParams({ neu: null });
          return !!link;
        }}
      />
    </div>
  );
}
