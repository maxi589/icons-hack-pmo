"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { Camera, Crosshair, MessageSquare, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTitle } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Kbd } from "@/components/ui/command";
import { useToast } from "@/components/toast";
import { useTeam } from "@/components/app-shell/team-provider";
import { useIsMobile } from "@/lib/use-is-mobile";
import {
  captureScreen,
  describeElement,
  FEEDBACK_TO,
  installErrorLog,
  KIND_LABEL,
  sendFeedback,
  type FeedbackKind,
  type FeedbackSpot,
} from "@/lib/feedback";

// Feedback-Knopf (Plan Welle 1, Schritt 4): Sprechblase unten in der Sidebar, „Feedback geben“ in Strg+K und im Handy-Menü.
// Desktop: kleines Popover am Symbol. Handy: Bottom Sheet. Bildschirmfoto wird beim Öffnen gezeichnet (Feedback-Fenster fehlt darin).
// Einmal im App-Rahmen eingebaut, geöffnet von überall mit openFeedback().

const handle = PopoverPrimitive.createHandle();
const TRIGGER_WIDE = "feedback-trigger";
const TRIGGER_RAIL = "feedback-trigger-rail";

type Store = { open: boolean; triggerId: string | null };
let store: Store = { open: false, triggerId: null };
const listeners = new Set<() => void>();
const set = (next: Partial<Store>) => {
  store = { ...store, ...next };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
// Jedes neue Öffnen meldet sich hier: Das Fenster zeichnet dann ein neues Foto.
const freshListeners = new Set<(delay: number) => void>();
const fresh = (delay: number) => freshListeners.forEach((l) => l(delay));

/** Öffnet das Feedback (neues Foto). `delay` wartet, bis z. B. Strg+K oder das Handy-Menü zu sind. */
export function openFeedback(delay = 0) {
  const collapsed = document.documentElement.dataset.sidebar === "collapsed";
  set({ open: true, triggerId: collapsed ? TRIGGER_RAIL : TRIGGER_WIDE });
  fresh(delay);
}

/** Sprechblase in der Sidebar (ausgeklappt bzw. eingeklappt). */
export function FeedbackTrigger({ rail = false, className }: { rail?: boolean; className?: string }) {
  return (
    <PopoverPrimitive.Trigger
      handle={handle}
      id={rail ? TRIGGER_RAIL : TRIGGER_WIDE}
      className={className}
      aria-label="Feedback geben"
      title="Feedback geben"
    >
      <MessageSquare className="size-4" strokeWidth={1.8} aria-hidden />
    </PopoverPrimitive.Trigger>
  );
}

type Shot = { blob: Blob; url: string } | null;

export function FeedbackPanel() {
  const state = useSyncExternalStore(subscribe, () => store, () => store);
  const isMobile = useIsMobile();
  const { me, people } = useTeam();
  const toast = useToast();
  const recipient = people.find((p) => p.initials === FEEDBACK_TO) ?? null;

  const [body, setBody] = useState("");
  const [kind, setKind] = useState<FeedbackKind | null>(null);
  const [include, setInclude] = useState(true);
  const [shot, setShot] = useState<Shot>(null);
  const [capturing, setCapturing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [spot, setSpot] = useState<FeedbackSpot | undefined>();
  const [picking, setPicking] = useState(false);
  const [sending, setSending] = useState(false);
  const run = useRef(0);

  useEffect(() => installErrorLog(), []);

  const replaceShot = useCallback((next: Shot) => {
    setShot((old) => {
      if (old) URL.revokeObjectURL(old.url);
      return next;
    });
  }, []);

  const capture = useCallback(
    async (withSpot?: FeedbackSpot, delay = 0) => {
      const id = ++run.current;
      setCapturing(true);
      setFailed(false);
      // Erst warten, bis Menüs und Strg+K zu sind und das Fenster gezeichnet ist.
      await new Promise((r) => setTimeout(r, delay));
      // Zeitgrenze: Im verdeckten Tab laufen keine Frames.
      await Promise.race([new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))), new Promise((r) => setTimeout(r, 100))]);
      const blob = await captureScreen(withSpot);
      if (id !== run.current) return;
      setCapturing(false);
      setFailed(!blob);
      replaceShot(blob ? { blob, url: URL.createObjectURL(blob) } : null);
    },
    [replaceShot]
  );

  // Jedes neue Öffnen = neues Foto der aktuellen Seite (Entwurfstext bleibt erhalten).
  useEffect(() => {
    const onFresh = (delay: number) => {
      setSpot(undefined);
      setInclude(true);
      capture(undefined, delay);
    };
    freshListeners.add(onFresh);
    return () => {
      freshListeners.delete(onFresh);
    };
  }, [capture]);

  const close = () => set({ open: false });

  const reset = () => {
    setBody("");
    setKind(null);
    setSpot(undefined);
    setInclude(true);
    replaceShot(null);
  };

  const submit = async () => {
    if (!me || !body.trim() || sending) return;
    setSending(true);
    const ok = await sendFeedback({
      body,
      kind,
      screenshot: include ? (shot?.blob ?? null) : null,
      spot,
      authorId: me.id,
      recipientId: recipient?.id ?? null,
    });
    setSending(false);
    if (!ok) {
      toast({ text: "Senden hat nicht geklappt. Bitte nochmal." });
      return;
    }
    close();
    reset();
    toast({ text: `Danke, ist bei ${recipient?.name.split(" ")[0] ?? "Maxi"}.` });
  };

  // „Stelle zeigen“: Fenster kurz zu, Element anklicken, dann Foto mit Rahmen.
  const startPicking = () => {
    set({ open: false });
    setPicking(true);
  };
  const finishPicking = (picked?: FeedbackSpot) => {
    setPicking(false);
    if (picked) {
      setSpot(picked);
      setInclude(true);
      capture(picked);
    }
    set({ open: true });
  };

  const form = (
    <Form
      body={body}
      setBody={setBody}
      kind={kind}
      setKind={setKind}
      include={include}
      shot={shot}
      capturing={capturing}
      failed={failed}
      spot={spot}
      mobile={isMobile}
      sending={sending}
      onRemoveShot={() => setInclude(false)}
      onAddShot={() => {
        setInclude(true);
        if (!shot) capture(spot);
      }}
      onRemoveSpot={() => {
        setSpot(undefined);
        capture();
      }}
      onPick={startPicking}
      onSubmit={submit}
    />
  );

  return (
    <>
      {isMobile ? (
        <Sheet open={state.open} onOpenChange={(o) => set({ open: o })}>
          <SheetContent
            data-feedback-ignore=""
            side="bottom"
            className="max-h-[92dvh] gap-3 overflow-y-auto px-3.5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))]"
          >
            <div className="mx-auto h-1 w-9 shrink-0 rounded-full bg-line-2" aria-hidden />
            <SheetTitle className="px-1 text-[17px] font-semibold">Feedback</SheetTitle>
            {form}
          </SheetContent>
        </Sheet>
      ) : (
        <Popover
          handle={handle}
          open={state.open}
          triggerId={state.triggerId}
          onOpenChange={(open, details) => {
            const triggerId = details.trigger?.id ?? store.triggerId;
            // Klick aufs Symbol = neues Foto; Schließen behält den Entwurf.
            set({ open, triggerId });
            if (open) fresh(0);
          }}
        >
          <PopoverContent data-feedback-ignore="" side="right" align="end" sideOffset={12} className="w-[340px] gap-3 p-3.5">
            <PopoverTitle className="text-[14px] font-semibold">Feedback</PopoverTitle>
            {form}
          </PopoverContent>
        </Popover>
      )}
      {picking && <SpotPicker onDone={finishPicking} />}
    </>
  );
}

const chip = (on: boolean) =>
  cn(
    "inline-flex h-7 items-center rounded-full px-2.5 text-[12.5px] transition-colors duration-150 max-md:h-10 max-md:px-3.5 max-md:text-[14px]",
    on ? "bg-active font-medium text-fg shadow-[inset_0_0_0_1px_var(--line2)]" : "text-fg-2 hover:bg-hover hover:text-fg"
  );
const ghostBtn =
  "inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[12.5px] font-medium text-fg-2 transition-colors duration-150 hover:bg-hover hover:text-fg max-md:h-11 max-md:text-[14px]";

function Form(p: {
  body: string;
  setBody: (v: string) => void;
  kind: FeedbackKind | null;
  setKind: (k: FeedbackKind | null) => void;
  include: boolean;
  shot: Shot;
  capturing: boolean;
  failed: boolean;
  spot?: FeedbackSpot;
  mobile: boolean;
  sending: boolean;
  onRemoveShot: () => void;
  onAddShot: () => void;
  onRemoveSpot: () => void;
  onPick: () => void;
  onSubmit: () => void;
}) {
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        p.onSubmit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          p.onSubmit();
        }
      }}
    >
      <label className="sr-only" htmlFor="feedback-text">
        Was fällt dir auf?
      </label>
      <textarea
        id="feedback-text"
        autoFocus={!p.mobile}
        rows={4}
        value={p.body}
        onChange={(e) => p.setBody(e.target.value)}
        placeholder="Was fällt dir auf?"
        className="w-full resize-none rounded-[9px] border border-field bg-card px-3 py-2 text-[14px] leading-normal text-fg placeholder:text-fg-3 focus-visible:outline-solid max-md:text-base"
      />

      <div className="flex flex-wrap gap-1" role="group" aria-label="Art">
        {(Object.keys(KIND_LABEL) as FeedbackKind[]).map((k) => (
          <button key={k} type="button" aria-pressed={p.kind === k} onClick={() => p.setKind(p.kind === k ? null : k)} className={chip(p.kind === k)}>
            {KIND_LABEL[k]}
          </button>
        ))}
      </div>

      {p.include ? (
        <div className="relative">
          {p.capturing ? (
            <div className="h-[120px] rounded-lg bg-card-2" aria-busy="true" aria-label="Bildschirmfoto wird erstellt" />
          ) : p.shot ? (
            // eslint-disable-next-line @next/next/no-img-element -- lokales Vorschaubild (Blob)
            <img
              src={p.shot.url}
              alt="Bildschirmfoto, wird mitgeschickt"
              className="max-h-[160px] w-full rounded-lg object-cover object-top shadow-[0_0_0_1px_var(--line2)]"
            />
          ) : (
            <p className="rounded-lg bg-card-2 px-3 py-2.5 text-[12.5px] text-fg-3">{p.failed ? "Bildschirmfoto nicht möglich." : " "}</p>
          )}
          {!p.capturing && p.shot && (
            <button
              type="button"
              onClick={p.onRemoveShot}
              aria-label="Bildschirmfoto nicht mitschicken"
              title="Nicht mitschicken"
              className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-card text-fg-2 shadow-[0_0_0_1px_var(--line2)] hover:text-fg max-md:size-10"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          )}
        </div>
      ) : (
        <button type="button" onClick={p.onAddShot} className={cn(ghostBtn, "self-start")}>
          <Camera className="size-3.5" aria-hidden />
          Bildschirm mitschicken
        </button>
      )}

      {p.spot && (
        <div className="flex min-w-0 items-center gap-2 text-[12.5px] text-fg-2">
          <Crosshair className="size-3.5 shrink-0 text-acc-line" aria-hidden />
          <span className="min-w-0 flex-1 truncate" title={p.spot.hint}>
            Stelle markiert
          </span>
          <button type="button" onClick={p.onRemoveSpot} aria-label="Markierung entfernen" className="grid size-6 place-items-center rounded-md text-fg-3 hover:bg-hover hover:text-fg">
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        {!p.mobile && (
          <button type="button" onClick={p.onPick} className={ghostBtn}>
            <Crosshair className="size-3.5" aria-hidden />
            Stelle zeigen
          </button>
        )}
        <button
          type="submit"
          disabled={!p.body.trim() || p.sending}
          className="ml-auto inline-flex h-8 items-center gap-2 rounded-[9px] bg-acc px-3 text-[13px] font-medium text-acc-text transition-[scale,opacity] duration-150 active:scale-[.97] disabled:opacity-50 max-md:h-11 max-md:flex-1 max-md:justify-center max-md:text-[15px]"
        >
          {p.sending ? "Sendet …" : "Senden"}
          {!p.mobile && <Kbd className="bg-transparent text-acc-text/80 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.35)]">Strg ↵</Kbd>}
        </button>
      </div>
    </form>
  );
}

/** Fadenkreuz: Element unter der Maus wird eingerahmt, Klick wählt es, Esc bricht ab. */
function SpotPicker({ onDone }: { onDone: (spot?: FeedbackSpot) => void }) {
  const layer = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<DOMRect | null>(null);
  const target = useRef<Element | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onDone();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onDone]);

  const under = (x: number, y: number) =>
    document.elementsFromPoint(x, y).find((el) => !layer.current?.contains(el) && el !== document.documentElement && el !== document.body) ?? null;

  return (
    <div
      ref={layer}
      data-feedback-ignore=""
      className="fixed inset-0 z-[80] cursor-crosshair"
      onPointerMove={(e) => {
        const el = under(e.clientX, e.clientY);
        target.current = el;
        setBox(el ? el.getBoundingClientRect() : null);
      }}
      onClick={(e) => {
        const el = target.current ?? under(e.clientX, e.clientY);
        if (!el) return onDone();
        const r = el.getBoundingClientRect();
        onDone({ rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, hint: describeElement(el) });
      }}
    >
      <div className="pointer-events-none fixed top-4 left-1/2 -translate-x-1/2 rounded-full bg-card-2 px-3.5 py-1.5 text-[12.5px] text-fg shadow-[0_0_0_1px_var(--line2),0_12px_32px_rgba(0,0,0,.35)]">
        Stelle anklicken · <Kbd>Esc</Kbd> bricht ab
      </div>
      {box && (
        <div
          className="pointer-events-none fixed rounded-md shadow-[0_0_0_2px_var(--accLine)]"
          style={{ left: box.x - 3, top: box.y - 3, width: box.width + 6, height: box.height + 6 }}
          aria-hidden
        />
      )}
    </div>
  );
}
