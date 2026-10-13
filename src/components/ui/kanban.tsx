"use client";

// Kanban nach Kibo UI (kibo-ui.com/r/kanban, MIT), angepasst:
// - Graphit-Tokens statt shadcn-Card/ScrollArea, deutsche Screenreader-Ansagen
// - Ziehen nur mit der Maus und erst nach 6px Bewegung, damit ein Klick die Karte öffnet.
//   Tastatur und Handy ändern die Stufe im Detail (kein Ziehen am Handy, Design-System 5).
// - Kein Kipp-Effekt beim Ziehen (Design-System 1), stattdessen Schatten
// - Reihenfolge innerhalb einer Spalte wird nicht gespeichert (sortiert die Seite selbst);
//   gemeldet wird nur der Wechsel der Spalte über `onMove`.

import type { Announcements, CollisionDetection, DragEndEvent, DragOverEvent, DragStartEvent } from "@dnd-kit/core";
import {
  closestCorners,
  pointerWithin,
  DndContext,
  DragOverlay,
  MouseSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createContext, type HTMLAttributes, type ReactNode, useContext, useState } from "react";
import { createPortal } from "react-dom";
import tunnel from "tunnel-rat";
import { cn } from "@/lib/utils";
import { play } from "@/lib/sounds";

const t = tunnel();

// Abgelegt wird, wo die Maus ist (Spalte oder Karte darin); nur außerhalb jeder Spalte die nächste.
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length ? hits : closestCorners(args);
};

type KanbanItem = { id: string; name: string; column: string };
type KanbanColumn = { id: string; name: string };

type Ctx = { columns: KanbanColumn[]; data: KanbanItem[]; activeId: string | null };
const KanbanContext = createContext<Ctx>({ columns: [], data: [], activeId: null });

export function KanbanBoard({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col gap-2 rounded-xl bg-col p-2 transition-shadow duration-150",
        isOver && "shadow-[inset_0_0_0_1.5px_var(--accLine)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function KanbanHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex h-[26px] items-center gap-2 px-1", className)} {...props} />;
}

export function KanbanCards<T extends KanbanItem>({
  id,
  children,
  empty,
  className,
}: {
  id: string;
  children: (item: T) => ReactNode;
  empty?: ReactNode;
  className?: string;
}) {
  const { data } = useContext(KanbanContext);
  const items = (data as T[]).filter((i) => i.column === id);
  return (
    <SortableContext id={id} items={items.map((i) => i.id)}>
      <div className={cn("flex min-h-[70px] flex-col gap-2", className)}>
        {items.map(children)}
        {items.length === 0 && empty}
      </div>
    </SortableContext>
  );
}

export function KanbanCard({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  const { attributes, listeners, setNodeRef, transition, transform, isDragging } = useSortable({ id });
  const { activeId } = useContext(KanbanContext);
  return (
    <>
      <div
        ref={setNodeRef}
        style={{ transition, transform: CSS.Transform.toString(transform) }}
        {...listeners}
        {...attributes}
        // Die Karte selbst ist ein Knopf (öffnet das Detail); der Rahmen soll nicht zusätzlich fokussierbar sein.
        role={undefined}
        tabIndex={-1}
        aria-roledescription={undefined}
        className={cn("touch-manipulation", isDragging && "opacity-30", className)}
      >
        {children}
      </div>
      {activeId === id && <t.In>{children}</t.In>}
    </>
  );
}

export function KanbanProvider<T extends KanbanItem>({
  columns,
  data,
  onMove,
  children,
  className,
}: {
  columns: KanbanColumn[];
  data: T[];
  onMove: (itemId: string, toColumn: string) => void;
  children: (column: KanbanColumn) => ReactNode;
  className?: string;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  // Während des Ziehens zeigt eine Vorschau die Karte schon in der neuen Spalte.
  const [preview, setPreview] = useState<T[] | null>(null);
  const items = preview ?? data;

  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 6 } }));

  const columnOf = (overId: string) =>
    items.find((i) => i.id === overId)?.column ?? columns.find((c) => c.id === overId)?.id ?? null;

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
    setPreview(data);
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const to = columnOf(String(over.id));
    setPreview((list) => (list ?? data).map((i) => (i.id === active.id && to && i.column !== to ? { ...i, column: to } : i)));
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    const from = data.find((i) => i.id === active.id)?.column;
    const to = over ? columnOf(String(over.id)) : null;
    setActiveId(null);
    setPreview(null);
    if (over) play("drop");
    if (to && from && to !== from) onMove(String(active.id), to);
  };

  const nameOf = (id: unknown) => items.find((i) => i.id === id)?.name ?? "Karte";
  const colName = (id: unknown) => columns.find((c) => c.id === columnOf(String(id)))?.name ?? "";
  const announcements: Announcements = {
    onDragStart: ({ active }) => `${nameOf(active.id)} aufgenommen.`,
    onDragOver: ({ active, over }) => (over ? `${nameOf(active.id)} über ${colName(over.id)}.` : undefined),
    onDragEnd: ({ active, over }) => (over ? `${nameOf(active.id)} in ${colName(over.id)} abgelegt.` : `${nameOf(active.id)} nicht verschoben.`),
    onDragCancel: ({ active }) => `Ziehen von ${nameOf(active.id)} abgebrochen.`,
  };

  return (
    <KanbanContext value={{ columns, data: items, activeId }}>
      <DndContext
        accessibility={{
          announcements,
          screenReaderInstructions: { draggable: "Stufe ändern: Karte öffnen und im Detail wählen." },
        }}
        collisionDetection={collision}
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActiveId(null);
          setPreview(null);
        }}
      >
        <div className={cn("flex items-stretch gap-2.5", className)}>{columns.map((c) => children(c))}</div>
        {typeof window !== "undefined" &&
          createPortal(
            <DragOverlay>
              <div className="cursor-grabbing rounded-[10px] shadow-[0_12px_28px_rgba(0,0,0,.25)]">
                <t.Out />
              </div>
            </DragOverlay>,
            document.body
          )}
      </DndContext>
    </KanbanContext>
  );
}
