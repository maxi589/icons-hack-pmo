"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FileText, Gavel, Link2, Search, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/select";
import { nameOptions } from "@/lib/options";
import { Avatar } from "@/components/avatar";
import { useToast } from "@/components/toast";
import { MobileSheet } from "@/components/mobile-sheet";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { MobileTitle, PageHeader } from "@/components/app-shell/page-header";
import { useTeam } from "@/components/app-shell/team-provider";
import { useTaskActions } from "@/components/tasks/use-task-actions";
import { DecisionDetail } from "@/components/wissen/decision-detail";
import { NewDecisionDialog } from "@/components/wissen/dialogs";
import { useToday } from "@/lib/use-today";
import { useIsMobile } from "@/lib/use-is-mobile";
import { formatShort, todayInVienna } from "@/lib/dates";
import { useDocuments } from "@/lib/data/use-documents";
import { useKnowledge, type Decision } from "@/lib/data/use-knowledge";
import { useMilestones } from "@/lib/data/use-milestones";
import { useOrganizations } from "@/lib/data/use-organizations";
import { useTasks } from "@/lib/data/use-tasks";
import { useMeetings } from "@/lib/data/use-meetings";
import { logActivity } from "@/lib/data/use-feed";
import { DECISION_TYPE, docType, formatSize, hostOf, NEW_TITLE, type Doc, type DocType } from "@/lib/documents";
import { DocDetail } from "./doc-detail";
import { topicLabel } from "./doc-fields";
import { firstLine, mdToText } from "@/lib/markdown";
import { DocText } from "./doc-text";
import { useDocActions } from "./use-doc-actions";
import { useTopics } from "./use-topics";

// Dokumente (Plan Welle 1, Schritt 2, ersetzt „Wissen“): Links, Dateien, Texte, Transkripte und Entscheidungen in einer Tabelle.
// Strg+V eines Links legt sofort ein Dokument an, eine Datei auf die Seite ziehen lädt sie hoch. Kein Pflichtformular.
// Adresse: ?dok=<id>, ?entscheidung=<id> (teilbar), ?neu=dokument bzw. ?neu=entscheidung.

type Filter = "alle" | "texte" | "dateien" | "entscheidungen";
const FILTERS: { id: Filter; label: string; short?: string }[] = [
  { id: "alle", label: "Alle" },
  { id: "texte", label: "Texte" },
  { id: "dateien", label: "Dateien & Links", short: "Dateien" },
  { id: "entscheidungen", label: "Entscheidungen" },
];

type Row = {
  key: string;
  id: string;
  isDecision: boolean;
  title: string;
  type: DocType;
  sub: string;
  area_id: string | null;
  target_type: string | null;
  target_id: string | null;
  by: string | null;
  when: string;
  search: string;
  filter: Filter;
};

const docRow = (d: Doc): Row => ({
  key: `d-${d.id}`,
  id: d.id,
  isDecision: false,
  title: d.title,
  type: docType(d),
  sub: d.kind === "link" ? hostOf(d.url) : d.kind === "file" ? formatSize(d.file_size) : "",
  area_id: d.area_id,
  target_type: d.target_type,
  target_id: d.target_id,
  by: d.updated_by ?? d.created_by,
  when: d.updated_at,
  search: `${d.title} ${d.url ?? ""} ${d.file_name ?? ""} ${mdToText(d.content ?? "")}`.toLowerCase(),
  filter: d.kind === "text" || d.kind === "transcript" ? "texte" : "dateien",
});

const decisionRow = (d: Decision): Row => ({
  key: `e-${d.id}`,
  id: d.id,
  isDecision: true,
  title: d.title,
  type: DECISION_TYPE,
  sub: d.reason ?? "",
  area_id: d.area_id,
  target_type: d.target_type,
  target_id: d.target_id,
  by: d.created_by,
  when: d.created_at,
  search: `${d.title} ${d.reason ?? ""}`.toLowerCase(),
  filter: "entscheidungen",
});

const isTyping = (el: EventTarget | null) => {
  const e = el as HTMLElement | null;
  return !!e && (e.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(e.tagName));
};

export function Documents() {
  const today = useToday();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const toast = useToast();
  const isMobile = useIsMobile();
  const { me, allAreas } = useTeam();
  const docsApi = useDocuments();
  const k = useKnowledge();
  const { milestones } = useMilestones();
  const { orgs } = useOrganizations();
  const tasksApi = useTasks();
  const { createTask } = useTaskActions(tasksApi);
  const { meetings } = useMeetings();
  const topics = useTopics(milestones, orgs, tasksApi.tasks, meetings);

  const [query, setQuery] = useState("");
  const [area, setArea] = useState("");
  const [filter, setFilter] = useState<Filter>("alle");
  const [full, setFull] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const selDoc = params.get("dok");
  const selDecision = params.get("entscheidung");
  const neu = params.get("neu");

  const setParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, v] of Object.entries(patch)) {
      if (v === null) next.delete(key);
      else next.set(key, v);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const open = (row: Pick<Row, "id" | "isDecision">) =>
    setParams(row.isDecision ? { entscheidung: row.id, dok: null } : { dok: row.id, entscheidung: null });
  const close = () => {
    setFull(false);
    setParams({ dok: null, entscheidung: null });
  };

  // Neu Angelegtes gleich öffnen, damit man den vorgeschlagenen Titel direkt ändern kann.
  const actions = useDocActions(docsApi, { onCreated: (d) => setParams({ dok: d.id, entscheidung: null, neu: null }) });
  const defaults = { area_id: area || null };

  // Strg+V irgendwo auf der Seite: Link → Dokument, Datei → hochladen.
  const actionsRef = useRef({ actions, defaults });
  useEffect(() => {
    actionsRef.current = { actions, defaults };
  });
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (isTyping(e.target) || document.querySelector("[role=dialog]")) return;
      const { actions: a, defaults: def } = actionsRef.current;
      const files = [...(e.clipboardData?.files ?? [])];
      if (files.length) {
        e.preventDefault();
        a.addFiles(files, def);
        return;
      }
      const text = e.clipboardData?.getData("text/plain") ?? "";
      if (text.trim()) {
        e.preventDefault();
        a.addLink(text, def).then((d) => !d && toast({ text: "Das ist keine Adresse. Links beginnen mit https:// oder einer Domain." }));
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [toast]);

  if (docsApi.docs === null || !k.decisions || !today) {
    return (
      <>
        <PageHeader title="Dokumente" />
        <div className="m-3.5 h-[420px] rounded-xl bg-card-2 md:m-5" aria-busy="true" aria-label="Dokumente lädt" />
      </>
    );
  }
  const docs = docsApi.docs || [];

  const all: Row[] = [...docs.map(docRow), ...k.decisions.map(decisionRow)].sort((a, b) => b.when.localeCompare(a.when));
  const q = query.trim().toLowerCase();
  const inArea = all.filter((r) => !area || r.area_id === area).filter((r) => !q || r.search.includes(q));
  const visible = inArea.filter((r) => filter === "alle" || r.filter === filter);
  const count = (f: Filter) => (f === "alle" ? inArea.length : inArea.filter((r) => r.filter === f).length);

  const doc = docs.find((d) => d.id === selDoc) ?? null;
  const decision = k.decisions.find((d) => d.id === selDecision) ?? null;
  const isText = doc && (doc.kind === "text" || doc.kind === "transcript");

  const deleteDecision = (d: Decision) => {
    close();
    k.removeDecision(d);
    toast({ text: `„${d.title}“ gelöscht`, onAction: () => k.restoreDecision(d) });
  };

  const detail = doc ? (
    isText ? (
      <DocText
        key={doc.id}
        doc={doc}
        topics={topics}
        full={full}
        onToggleFull={isMobile ? undefined : () => setFull((v) => !v)}
        onUpdate={(p) => docsApi.update(doc.id, p, me?.id ?? null)}
        onSaveContent={(content) => {
          // Solange kein Titel vergeben ist, gilt die erste Zeile als Titel (wie in Apple Notes).
          const first = firstLine(content);
          const title = doc.title === NEW_TITLE && first ? first.slice(0, 80) : undefined;
          return docsApi.update(doc.id, title ? { content, title } : { content }, me?.id ?? null);
        }}
        onCreateTask={(title) =>
          // Dokument einer Firma: die Aufgabe gehört dann auch zur Firma (steht in deren Block „Aufgaben“)
          createTask(
            { title, area_id: doc.area_id, organization_id: doc.target_type === "organization" ? doc.target_id : null },
            (id) => `/aufgaben?aufgabe=${id}`
          )
        }
        onDelete={() => {
          close();
          actions.deleteDoc(doc);
        }}
        onClose={close}
      />
    ) : (
      <DocDetail
        key={doc.id}
        doc={doc}
        topics={topics}
        onUpdate={(p) => docsApi.update(doc.id, p, me?.id ?? null)}
        onOpen={() => actions.openDoc(doc)}
        onDelete={() => {
          close();
          actions.deleteDoc(doc);
        }}
        onClose={close}
      />
    )
  ) : decision ? (
    <DecisionDetail
      key={decision.id}
      decision={decision}
      topics={topics}
      onUpdate={(p) => k.updateDecision(decision.id, p)}
      onDelete={() => deleteDecision(decision)}
      onClose={close}
    />
  ) : null;

  const newDoc = () => setParams({ neu: "dokument" });

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col"
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        setDragging(false);
        actions.addFiles([...e.dataTransfer.files], defaults);
      }}
    >
      <PageHeader title="Dokumente" action={{ label: "Dokument", onClick: newDoc }} />
      <div className="relative flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col md:overflow-auto">
          <MobileTitle title="Dokumente" action={{ label: "Dokument", onClick: newDoc }} />
          <h1 className="sr-only max-md:hidden">Dokumente</h1>

          {/* Filter: Art als Chips, Bereich, Suche (Handy: Chips in einer Zeile, darunter Suche + Bereich) */}
          <div className="flex flex-wrap items-center gap-2 px-3.5 pb-3 md:border-b md:border-line md:px-[18px] md:py-3">
            <div
              className="flex gap-1 max-md:-mx-3.5 max-md:w-[calc(100%+28px)] max-md:overflow-x-auto max-md:px-3.5 max-md:[scrollbar-width:none] md:flex-wrap"
              role="group"
              aria-label="Art"
            >
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={filter === f.id}
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] whitespace-nowrap transition-colors duration-150 max-md:h-10",
                    filter === f.id ? "bg-active font-medium text-fg shadow-[inset_0_0_0_1px_var(--line2)]" : "text-fg-2 hover:bg-hover hover:text-fg"
                  )}
                >
                  {f.short ? (
                    <>
                      <span className="md:hidden">{f.short}</span>
                      <span className="max-md:hidden">{f.label}</span>
                    </>
                  ) : (
                    f.label
                  )}
                  <span className="text-[12px] text-fg-3 tabular">{count(f.id)}</span>
                </button>
              ))}
            </div>
            <div className="max-md:order-last max-md:w-[132px] md:w-[180px]">
              <Select
                aria-label="Bereich"
                value={area}
                onChange={setArea}
                options={nameOptions(allAreas, isMobile ? "Bereich" : "Alle Bereiche")}
                className={cn(
                  "h-8 w-full rounded-[9px] border border-field bg-card pr-2 pl-2.5 text-[13px] text-fg hover:bg-hover max-md:h-10 max-md:text-base",
                  area && "bg-active hover:bg-active"
                )}
              />
            </div>
            <label className="relative flex min-w-0 items-center max-md:flex-1 md:ml-auto md:w-[240px]">
              <Search className="pointer-events-none absolute left-2.5 size-3.5 text-fg-3" aria-hidden />
              <span className="sr-only">Dokumente durchsuchen</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Suchen …"
                className="h-8 w-full rounded-[9px] border border-field bg-card pr-2.5 pl-8 text-[13px] text-fg placeholder:text-fg-3 focus-visible:outline-solid max-md:h-10 max-md:text-base"
              />
            </label>
          </div>

          {docsApi.docs === false && <p className="px-5 py-8 text-center text-[13.5px] text-st-red">Dokumente konnten nicht geladen werden.</p>}
          {all.length === 0 ? (
            <button
              type="button"
              onClick={newDoc}
              className="m-3.5 flex flex-col items-center gap-2 rounded-[14px] border border-dashed border-line-2 bg-card-2 px-4 py-14 text-center text-[14px] text-fg-2 hover:text-fg md:m-5"
            >
              <Upload className="size-5 text-fg-3" aria-hidden />
              Link einfügen oder Datei hierher ziehen.
            </button>
          ) : visible.length === 0 ? (
            <p className="px-5 py-8 text-center text-[13.5px] text-fg-2">Keine Treffer.</p>
          ) : isMobile ? (
            <DocList rows={visible} topics={topics} today={today} selected={selDoc ?? selDecision} onOpen={open} />
          ) : (
            <DocTable rows={visible} topics={topics} today={today} selected={selDoc ?? selDecision} onOpen={(r) => (r.id === (selDoc ?? selDecision) ? close() : open(r))} />
          )}
        </div>

        {detail && !isMobile && (
          <aside
            data-detail
            aria-label="Dokument im Detail"
            className={cn(
              "shrink-0 overflow-y-auto border-l border-line bg-card",
              isText ? (full ? "absolute inset-0 z-10 border-l-0" : "w-[min(760px,56%)]") : "w-[400px]"
            )}
          >
            {detail}
          </aside>
        )}
      </div>

      <MobileSheet open={!!detail && isMobile} onClose={close} title={doc?.title ?? decision?.title ?? ""}>
        {detail}
      </MobileSheet>

      {dragging && (
        <div className="pointer-events-none absolute inset-2 z-20 grid place-items-center rounded-[14px] border-2 border-dashed border-acc-line bg-panel/85 text-[15px] font-medium text-fg">
          <span className="inline-flex items-center gap-2">
            <Upload className="size-4 text-acc-line" aria-hidden />
            Datei hier ablegen
          </span>
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

      <NewDocDialog
        open={neu === "dokument"}
        onOpenChange={(o) => !o && setParams({ neu: null })}
        onLink={async (url) => !!(await actions.addLink(url, defaults))}
        onText={() => actions.addText(defaults)}
        onFile={() => {
          setParams({ neu: null });
          fileInput.current?.click();
        }}
        onDecision={() => setParams({ neu: "entscheidung" })}
      />

      <NewDecisionDialog
        open={neu === "entscheidung" || neu === "1"}
        onOpenChange={(o) => !o && setParams({ neu: null })}
        today={today}
        topics={topics}
        onCreate={async (input) => {
          const d = await k.createDecision(input);
          if (!d) return false;
          logActivity("decision", d.id, me?.id ?? null, "created");
          setParams({ neu: null, entscheidung: d.id, dok: null });
          toast({ text: `„${d.title}“ festgehalten` });
          return true;
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------
// Tabelle (Desktop) in der Optik der Pipeline-Tabelle; Spalten fallen bei wenig Platz weg
// ---------------------------------------------------------------
function DocTable({
  rows,
  topics,
  today,
  selected,
  onOpen,
}: {
  rows: Row[];
  topics: ReturnType<typeof useTopics>;
  today: string;
  selected: string | null;
  onOpen: (r: Row) => void;
}) {
  const { areaById, personById } = useTeam();
  const th = "sticky top-0 z-[2] h-9 border-b border-line bg-panel px-3 text-left font-medium";
  const cell = "h-11 overflow-hidden border-b border-line px-3 whitespace-nowrap";
  const hideTopic = "@max-[900px]:hidden";
  const hideArea = "@max-[680px]:hidden";

  return (
    <div className="@container flex min-h-full flex-col">
      <table className="w-full table-fixed border-separate border-spacing-0 text-[13px]">
        <thead className="text-[12px] text-fg-3">
          <tr>
            <th className={cn(th, "pl-[18px]")}>Titel</th>
            <th className={cn(th, "w-[180px]", hideArea)}>Bereich</th>
            <th className={cn(th, "w-[220px]", hideTopic)}>Gehört zu</th>
            <th className={cn(th, "w-[64px]")}>Von</th>
            <th className={cn(th, "w-[104px] pr-[18px]")}>Geändert</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const sel = r.id === selected;
            const a = areaById(r.area_id);
            const topic = topicLabel(topics, r.target_type, r.target_id);
            const day = todayInVienna(new Date(r.when));
            return (
              <tr key={r.key} onClick={() => onOpen(r)} className={cn("cursor-pointer transition-colors duration-150", sel ? "bg-active" : "hover:bg-hover")}>
                <td className="h-11 overflow-hidden border-b border-line pr-3 pl-[18px]">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="grid size-[26px] shrink-0 place-items-center rounded-md bg-active text-fg-2" aria-hidden>
                      <r.type.Icon className="size-3.5" />
                    </span>
                    <span className="flex min-w-0 flex-col leading-tight">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpen(r);
                        }}
                        aria-current={sel ? "true" : undefined}
                        className="truncate rounded-sm text-left font-medium"
                      >
                        {r.title}
                      </button>
                      <span className="truncate text-[11.5px] text-fg-3">{[r.type.label, r.sub].filter(Boolean).join(" · ")}</span>
                    </span>
                  </span>
                </td>
                <td className={cn(cell, hideArea)}>
                  {a ? (
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <span className="size-[7px] shrink-0 rounded-full" style={{ background: a.color }} aria-hidden />
                      <span className="truncate">{a.name}</span>
                    </span>
                  ) : (
                    <span className="text-fg-3">–</span>
                  )}
                </td>
                <td className={cn(cell, hideTopic, "text-fg-2")} title={topic ?? undefined}>
                  <span className="block truncate">{topic ?? <span className="text-fg-3">–</span>}</span>
                </td>
                <td className={cell}>
                  <Avatar person={personById(r.by)} size={20} />
                </td>
                <td className={cn(cell, "pr-[18px] text-fg-2 tabular")}>{day === today ? "heute" : formatShort(day)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="sticky bottom-0 z-[2] mt-auto flex h-9 shrink-0 items-center border-t border-line bg-panel px-[18px] text-[12px] text-fg-2 tabular">
        {rows.length} {rows.length === 1 ? "Eintrag" : "Einträge"}
        <span className="ml-auto text-fg-3">Link einfügen (Strg+V) oder Datei hierher ziehen</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// Liste (Handy)
// ---------------------------------------------------------------
function DocList({
  rows,
  topics,
  today,
  selected,
  onOpen,
}: {
  rows: Row[];
  topics: ReturnType<typeof useTopics>;
  today: string;
  selected: string | null;
  onOpen: (r: Row) => void;
}) {
  const { areaById } = useTeam();
  return (
    <ul className="mx-3.5 mb-8 overflow-hidden rounded-xl bg-card shadow-card">
      {rows.map((r) => {
        const a = areaById(r.area_id);
        const topic = topicLabel(topics, r.target_type, r.target_id);
        const day = todayInVienna(new Date(r.when));
        return (
          <li key={r.key} className={cn("relative flex min-h-14 items-center gap-3 border-t border-line px-3.5 py-2.5 first:border-t-0", r.id === selected && "bg-active")}>
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-active text-fg-2" aria-hidden>
              <r.type.Icon className="size-4" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <button type="button" onClick={() => onOpen(r)} className="truncate rounded-sm text-left text-[15px] font-medium after:absolute after:inset-0">
                {r.title}
              </button>
              <span className="truncate text-[12.5px] text-fg-3">
                {[r.type.label, a?.name, topic, day === today ? "heute" : formatShort(day)].filter(Boolean).join(" · ")}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------
// „+ Dokument“: Link einfügen, Text schreiben, Datei hochladen oder Entscheidung festhalten
// ---------------------------------------------------------------
function NewDocDialog({
  open,
  onOpenChange,
  onLink,
  onText,
  onFile,
  onDecision,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onLink: (url: string) => Promise<boolean>;
  onText: () => void;
  onFile: () => void;
  onDecision: () => void;
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const option =
    "flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-left text-[14px] text-fg transition-colors duration-150 hover:bg-hover shadow-[inset_0_0_0_1px_var(--line)]";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setUrl("");
          setError(false);
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="gap-4 p-5 sm:max-w-[440px]">
        <DialogTitle className="pr-8 text-base font-semibold">Neues Dokument</DialogTitle>
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!url.trim() || busy) return;
            setBusy(true);
            const ok = await onLink(url);
            setBusy(false);
            setError(!ok);
            if (ok) setUrl("");
          }}
        >
          <label className="sr-only" htmlFor="new-doc-url">
            Link
          </label>
          <span className="relative flex flex-1 items-center">
            <Link2 className="pointer-events-none absolute left-3 size-4 text-fg-3" aria-hidden />
            <input
              id="new-doc-url"
              autoFocus
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError(false);
              }}
              placeholder="Link einfügen …"
              aria-invalid={error || undefined}
              className="h-11 w-full rounded-[10px] border border-field bg-card pr-3 pl-9 text-[14px] text-fg placeholder:text-fg-3 focus-visible:outline-solid max-md:text-base"
            />
          </span>
          <button type="submit" disabled={!url.trim() || busy} className="h-11 rounded-[10px] bg-acc px-4 text-[14px] font-medium text-acc-text disabled:opacity-50">
            Ablegen
          </button>
        </form>
        {error && (
          <p role="alert" className="-mt-2 text-[13px] text-st-red">
            Das ist keine Adresse.
          </p>
        )}
        <div className="grid gap-2">
          <button type="button" onClick={onText} className={option}>
            <FileText className="size-4 text-fg-3" aria-hidden />
            Text schreiben
          </button>
          <button type="button" onClick={onFile} className={option}>
            <Upload className="size-4 text-fg-3" aria-hidden />
            Datei hochladen
          </button>
          <button type="button" onClick={onDecision} className={option}>
            <Gavel className="size-4 text-fg-3" aria-hidden />
            Entscheidung festhalten
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
