"use client";

import { useMemo, useRef, useState } from "react";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/avatar";
import { useTeam, type Person } from "@/components/app-shell/team-provider";
import { addComment, useFeed, type FeedItem, type TargetType } from "@/lib/data/use-feed";

// Verlauf + Kommentarfeld mit @-Erwähnung (Design-System 6.3). Wiederverwendbar für Aufgaben usw.

function when(iso: string) {
  const d = parseISO(iso);
  const time = format(d, "HH:mm");
  if (isToday(d)) return `heute, ${time}`;
  if (isYesterday(d)) return `gestern, ${time}`;
  return format(d, "EEEEEE, d.M., HH:mm", { locale: de });
}

/** Kommentartext mit hervorgehobenen @Namen. */
function Body({ text, people }: { text: string; people: Person[] }) {
  const names = people.map((p) => p.name).sort((a, b) => b.length - a.length);
  if (!names.length) return <>{text}</>;
  const re = new RegExp(`(@(?:${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")}))`, "g");
  return (
    <>
      {text.split(re).map((part, i) =>
        // split() mit Klammer-Gruppe: jeder zweite Teil ist ein @Name
        i % 2 === 1 ? (
          <span key={i} className="font-medium text-acc-line">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
}

export function Feed({
  targetType,
  targetId,
  describe,
}: {
  targetType: TargetType;
  targetId: string;
  describe: (item: Extract<FeedItem, { kind: "activity" }>) => string;
}) {
  const { items } = useFeed(targetType, targetId);

  return (
    <div className="flex flex-col gap-3.5">
      <h3 className="label-mono">Verlauf</h3>
      {items === null && <div className="h-10 rounded-lg bg-card-2" aria-busy="true" />}
      {items?.length === 0 && <p className="text-[12.5px] text-fg-3">Noch keine Kommentare.</p>}
      {items && <FeedEntries items={items} describe={describe} />}
      <Composer targetType={targetType} targetId={targetId} />
    </div>
  );
}

type Describe = (item: Extract<FeedItem, { kind: "activity" }>) => string;

function FeedEntries({ items, describe }: { items: FeedItem[]; describe: Describe }) {
  const { people, personById } = useTeam();
  return (
      <ol className="flex flex-col gap-3.5">
        {items.map((it) =>
          it.kind === "activity" ? (
            <li key={`a${it.id}`} className="flex gap-2.5 text-[12.5px] text-fg-3">
              <span className="flex w-5 shrink-0 justify-center pt-[5px]" aria-hidden>
                <span className="size-1.5 rounded-full bg-st-gray" />
              </span>
              <span>
                <b className="font-medium text-fg-2">{personById(it.actor_id)?.name ?? "Jemand"}</b> {describe(it)} · {when(it.created_at)}
              </span>
            </li>
          ) : (
            <li key={`c${it.id}`} className="flex gap-2.5">
              <Avatar person={personById(it.author_id)} size={20} />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="text-[12.5px]">
                  <b className="font-semibold">{personById(it.author_id)?.name ?? "Jemand"}</b>{" "}
                  <span className="text-fg-3">· {when(it.created_at)}</span>
                </div>
                <p className="text-[13.5px] leading-normal break-words whitespace-pre-wrap">
                  <Body text={it.body} people={people} />
                </p>
              </div>
            </li>
          )
        )}
      </ol>
  );
}

/**
 * Kurzer Verlauf (Roadmap-Cockpit, 16.10.): nur die letzten Einträge, „Alle n anzeigen“ klappt den Rest auf.
 * Ohne Überschrift und ohne Leerzustand; das Kommentarfeld steht beim Aufrufer (Composer variant="line").
 */
export function CompactFeed({ targetType, targetId, describe, limit = 3 }: { targetType: TargetType; targetId: string; describe: Describe; limit?: number }) {
  const { items } = useFeed(targetType, targetId);
  const [all, setAll] = useState(false);
  if (!items?.length) return null;
  const shown = all ? items : items.slice(-limit);
  return (
    <div className="flex flex-col gap-2.5">
      {items.length > limit && (
        <button type="button" aria-expanded={all} onClick={() => setAll((v) => !v)} className="self-start rounded-md text-[12.5px] text-fg-2 hover:text-fg max-md:min-h-11">
          {all ? "Weniger anzeigen" : `Alle ${items.length} anzeigen`}
        </button>
      )}
      <FeedEntries items={shown} describe={describe} />
    </div>
  );
}

/** Kommentarfeld mit @-Erwähnung. box = Feld mit zwei Zeilen und „Senden“ (Strg+Enter); line = eine Zeile, Enter sendet
 *  (Roadmap-Cockpit, 16.10.: neben „Erledigt“). */
export function Composer({ targetType, targetId, variant = "box" }: { targetType: TargetType; targetId: string; variant?: "box" | "line" }) {
  const { me, people } = useTeam();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState<string | null>(null); // Text nach „@“ während der Eingabe
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);
  const line = variant === "line";

  const suggestions = useMemo(
    () => (query === null ? [] : people.filter((p) => p.name.toLowerCase().startsWith(query.toLowerCase())).slice(0, 5)),
    [query, people]
  );

  const onChange = (value: string, caret: number) => {
    setText(value);
    const m = value.slice(0, caret).match(/(?:^|\s)@([\p{L} ]{0,12})$/u);
    setQuery(m ? m[1] : null);
    setActive(0);
  };

  const pick = (p: Person) => {
    const el = ref.current;
    if (!el) return;
    const caret = el.selectionStart ?? text.length;
    const before = text.slice(0, caret).replace(/@([\p{L} ]{0,12})$/u, `@${p.name} `);
    const next = before + text.slice(caret);
    setText(next);
    setQuery(null);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(before.length, before.length);
    });
  };

  const send = async () => {
    const body = text.trim();
    // busy: zweimal Enter bei langsamem Netz würde den Kommentar sonst doppelt speichern
    if (!body || !me || busy) return;
    setBusy(true);
    setError(false);
    const mentions = people.filter((p) => body.includes(`@${p.name}`)).map((p) => p.id);
    const ok = await addComment(targetType, targetId, me.id, body, mentions);
    setBusy(false);
    if (ok) setText("");
    else setError(true);
  };

  const fieldProps = {
    id: `cm-${targetId}`,
    ref,
    value: text,
    placeholder: line ? "Kommentar … @" : "Kommentar … @ erwähnt",
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => onChange(e.target.value, e.target.selectionStart ?? e.target.value.length),
    onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      if (suggestions.length) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setActive((a) => (a + 1) % suggestions.length);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setActive((a) => (a - 1 + suggestions.length) % suggestions.length);
        } else if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          pick(suggestions[active]);
        } else if (e.key === "Escape") {
          setQuery(null);
        }
        return;
      }
      if (e.key === "Enter" && (line || e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        send();
      }
    },
    "aria-describedby": `cm-hint-${targetId}`,
  };
  const sendButton = (
    <button
      type="button"
      onClick={send}
      disabled={busy || !text.trim()}
      className={cn(
        "shrink-0 rounded-[9px] bg-acc px-3 text-[13px] font-medium text-acc-text transition-[scale,opacity] duration-150 active:scale-[.97] disabled:opacity-50",
        line ? "h-8 max-md:h-11" : "h-[38px]"
      )}
    >
      Senden
    </button>
  );

  return (
    <div className={cn("relative flex min-w-0 flex-col gap-1.5", line ? "flex-1" : "pt-1")}>
      <label htmlFor={`cm-${targetId}`} className={line ? "sr-only" : "text-[12px] text-fg-3"}>
        Kommentar
      </label>
      {line ? (
        <div className="flex items-center gap-1.5">
          <input
            {...fieldProps}
            className="h-8 min-w-0 flex-1 rounded-[9px] bg-panel px-3 text-[13px] text-fg shadow-[inset_0_0_0_1px_var(--field)] outline-none placeholder:text-fg-3 focus-visible:shadow-[inset_0_0_0_1.5px_var(--accLine)] max-md:h-11 max-md:text-base"
          />
          {/* „Senden“ erst mit Text: Enter sendet, am Handy braucht es den Knopf */}
          {text.trim() && sendButton}
        </div>
      ) : (
        <div className="flex items-end gap-2">
          <textarea
            {...fieldProps}
            rows={2}
            className="min-h-[60px] flex-1 resize-none rounded-[10px] bg-panel px-3 py-2.5 text-[13.5px] leading-[1.45] text-fg shadow-[inset_0_0_0_1px_var(--field)] outline-none placeholder:text-fg-3 focus-visible:shadow-[inset_0_0_0_1.5px_var(--accLine)]"
          />
          {sendButton}
        </div>
      )}
      <p id={`cm-hint-${targetId}`} className="sr-only">
        {line ? "Enter sendet" : "Strg + Enter sendet"}
      </p>
      {error && (
        <p role="alert" className="text-[12.5px] text-st-red">
          Kommentar nicht gespeichert. Bitte nochmal senden.
        </p>
      )}

      {suggestions.length > 0 && (
        <ul
          role="listbox"
          aria-label="Person erwähnen"
          className="absolute bottom-full left-0 z-10 mb-1 w-56 rounded-xl bg-card p-1 shadow-[0_0_0_1px_var(--line2),0_12px_30px_rgba(0,0,0,.18)]"
        >
          {suggestions.map((p, i) => (
            <li key={p.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(p)}
                className={cn("flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13.5px]", i === active && "bg-active")}
              >
                <Avatar person={p} size={22} />
                {p.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
