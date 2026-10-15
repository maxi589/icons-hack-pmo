"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { Check, RotateCcw, X } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { MobileSheet } from "@/components/mobile-sheet";
import { Avatar } from "@/components/avatar";
import { Chip, type ChipTone } from "@/components/chip";
import { CopyLinkButton } from "@/components/copy-link-button";
import { PropRow } from "@/components/detail-fields";
import { useToast } from "@/components/toast";
import { useTeam } from "@/components/app-shell/team-provider";
import { useInbox } from "@/components/app-shell/inbox-provider";
import { useIsMobile } from "@/lib/use-is-mobile";
import { targetHref } from "@/lib/links";
import {
  KIND_LABEL,
  loadFeedback,
  notifyDone,
  screenshotUrl,
  setFeedbackStatus,
  STATUS_LABEL,
  type Feedback,
  type FeedbackStatus,
} from "@/lib/feedback";

// Feedback im Detail (aus der Inbox, Adresse /inbox?feedback=<id>): Text, Bildschirmfoto, Kontext, Status.
// Desktop rechts 460px, Handy Bottom Sheet. „Umgesetzt“ meldet es der absendenden Person (nach 5 s, vorher Rückgängig).

export const STATUS_TONE: Record<FeedbackStatus, ChipTone> = { offen: "amber", umgesetzt: "green", verworfen: "gray" };

const when = (iso: string) => format(parseISO(iso), "EEEEEE, d.M., HH:mm", { locale: de });

export function FeedbackDetail({ id, onClose }: { id: string | null; onClose: () => void }) {
  const isMobile = useIsMobile();
  const open = !!id;
  const body = id ? <FeedbackBody key={id} id={id} onClose={onClose} /> : null;

  if (isMobile) {
    return (
      <MobileSheet open={open} onClose={onClose} title="Feedback">
        {body}
      </MobileSheet>
    );
  }
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent data-detail side="right" showCloseButton={false} className="gap-0 overflow-y-auto data-[side=right]:w-[460px] data-[side=right]:sm:max-w-[460px]">
        <SheetTitle className="sr-only">Feedback</SheetTitle>
        {body}
      </SheetContent>
    </Sheet>
  );
}

function FeedbackBody({ id, onClose }: { id: string; onClose: () => void }) {
  const { me, personById } = useTeam();
  const { reload } = useInbox();
  const toast = useToast();
  const [fb, setFb] = useState<Feedback | null | undefined>(undefined);
  const [img, setImg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadFeedback(id).then(async (f) => {
      if (!alive) return;
      setFb(f);
      if (f?.screenshot_path) {
        const url = await screenshotUrl(f.screenshot_path);
        if (alive) setImg(url);
      }
    });
    return () => {
      alive = false;
    };
  }, [id]);

  if (fb === undefined) return <div className="m-[18px] h-[320px] rounded-xl bg-card-2" aria-busy="true" aria-label="Feedback lädt" />;
  if (fb === null) return <p className="px-[18px] py-10 text-center text-[13px] text-fg-3">Feedback nicht mehr vorhanden.</p>;

  const author = personById(fb.author_id);
  const resolver = personById(fb.resolved_by);
  const ctx = fb.context ?? {};

  const change = async (status: FeedbackStatus) => {
    const before = fb;
    const next = { ...fb, status, resolved_by: status === "offen" ? null : (me?.id ?? null), resolved_at: status === "offen" ? null : new Date().toISOString() };
    setFb(next);
    if (!(await setFeedbackStatus(fb.id, status, me?.id ?? null))) {
      setFb(before);
      toast({ text: "Speichern hat nicht geklappt." });
      return;
    }
    reload();
    let undone = false;
    toast({
      text: `Feedback → ${STATUS_LABEL[status]}`,
      onAction: async () => {
        undone = true;
        setFb(before);
        await setFeedbackStatus(fb.id, before.status, before.resolved_by);
        reload();
      },
      onExpire: () => {
        if (!undone && status === "umgesetzt" && me) notifyDone(fb, me.id);
      },
    });
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 border-b border-line px-[18px] pt-4 pb-3.5">
        <Avatar person={author} size={26} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold">{author?.name ?? "Jemand"}</p>
          <p className="text-[12px] text-fg-3 tabular">{when(fb.created_at)}</p>
        </div>
        <CopyLinkButton path={targetHref("feedback", fb.id)} label="Link zu diesem Feedback kopieren" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Detail schließen"
          className="grid size-8 shrink-0 place-items-center rounded-lg text-fg-3 transition-colors duration-150 hover:bg-hover hover:text-fg max-md:size-11"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <div className="flex flex-col gap-4 px-[18px] py-4">
        <div className="flex flex-wrap gap-1.5">
          <Chip tone={STATUS_TONE[fb.status]} still>
            {STATUS_LABEL[fb.status]}
          </Chip>
          {fb.kind && <Chip still>{KIND_LABEL[fb.kind]}</Chip>}
        </div>

        <p className="text-[14px] leading-relaxed whitespace-pre-wrap md:text-[14px]">{fb.body}</p>

        {fb.screenshot_path &&
          (img ? (
            <a href={img} target="_blank" rel="noreferrer" className="block rounded-lg" title="Bild in voller Größe öffnen">
              {/* eslint-disable-next-line @next/next/no-img-element -- kurzlebiger Link aus dem Speicher */}
              <img src={img} alt="Bildschirmfoto zum Feedback" className="w-full rounded-lg shadow-[0_0_0_1px_var(--line2)]" />
            </a>
          ) : (
            <div className="h-[180px] rounded-lg bg-card-2" aria-busy="true" aria-label="Bild lädt" />
          ))}

        <div className="flex flex-col">
          <PropRow label="Seite">
            <Link href={fb.page || "/"} className="block truncate leading-8 text-acc-line hover:underline">
              {fb.page || "–"}
            </Link>
          </PropRow>
          <PropRow label="Stelle">
            <span className="block py-1.5 leading-snug text-fg-2">{ctx.spot?.hint ?? "–"}</span>
          </PropRow>
          <PropRow label="Gerät">
            <span className="block leading-8 text-fg-2">{[ctx.device, ctx.browser, ctx.viewport].filter(Boolean).join(" · ") || "–"}</span>
          </PropRow>
          <PropRow label="Darstellung">
            <span className="block leading-8 text-fg-2">{ctx.theme ?? "–"}</span>
          </PropRow>
          <PropRow label="Version">
            <span className="block font-mono text-[12px] leading-8 text-fg-2">{ctx.version ?? "–"}</span>
          </PropRow>
          <PropRow label="Fehler">
            {ctx.errors?.length ? (
              <ul className="flex flex-col gap-1 py-1.5">
                {ctx.errors.map((e, i) => (
                  <li key={i} className="font-mono text-[11.5px] leading-snug break-words text-fg-2">
                    {e.message}
                  </li>
                ))}
              </ul>
            ) : (
              <span className="block leading-8 text-fg-2">–</span>
            )}
          </PropRow>
        </div>

        {fb.status === "offen" ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => change("umgesetzt")}
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[9px] bg-acc px-3.5 text-[13.5px] font-medium text-acc-text transition-[scale] duration-150 active:scale-[.97] max-md:h-11"
            >
              <Check className="size-4" aria-hidden />
              Umgesetzt
            </button>
            <button
              type="button"
              onClick={() => change("verworfen")}
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[9px] px-3.5 text-[13.5px] font-medium text-fg-2 shadow-[inset_0_0_0_1px_var(--line2)] transition-colors duration-150 hover:bg-hover hover:text-fg max-md:h-11"
            >
              <X className="size-4" aria-hidden />
              Verworfen
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[13px] text-fg-3">
            <span className="flex-1">
              {STATUS_LABEL[fb.status][0].toUpperCase() + STATUS_LABEL[fb.status].slice(1)}
              {resolver ? ` von ${resolver.name}` : ""}
              {fb.resolved_at ? ` · ${when(fb.resolved_at)}` : ""}
            </span>
            <button
              type="button"
              onClick={() => change("offen")}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-fg-2 transition-colors duration-150 hover:bg-hover hover:text-fg max-md:h-11"
            >
              <RotateCcw className="size-3.5" aria-hidden />
              Wieder öffnen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
