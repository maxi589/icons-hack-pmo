"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { Check, CheckCheck, Link2, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/avatar";
import { PageHeader } from "@/components/app-shell/page-header";
import { useTeam } from "@/components/app-shell/team-provider";
import { useInbox, type InboxItem } from "@/components/app-shell/inbox-provider";
import { TARGET_NAMES } from "@/lib/links";
import { Chip } from "@/components/chip";
import { FeedbackDetail, STATUS_TONE } from "@/components/feedback/feedback-detail";
import { STATUS_LABEL, type FeedbackStatus } from "@/lib/feedback";

// Inbox (Umfang v1, ohne Mails): Erwähnungen, Zuweisungen und Feedback der angemeldeten Person.
// Feedback öffnet rechts im Detail (?feedback=<id>), alles andere führt zum Eintrag.
// Klick öffnet den Eintrag und markiert ihn als gelesen. „Link“ kopiert den Direktlink für WhatsApp.

function dayLabel(iso: string) {
  const d = parseISO(iso);
  if (isToday(d)) return "Heute";
  if (isYesterday(d)) return "Gestern";
  return format(d, "EEEEEE, d. MMMM", { locale: de });
}

const iconBtn =
  "relative z-[1] grid size-8 shrink-0 place-items-center rounded-lg text-fg-3 transition-colors duration-150 hover:bg-hover hover:text-fg max-md:size-11";

export function Inbox() {
  const { items, unread, setRead } = useInbox();
  const router = useRouter();
  const feedbackId = useSearchParams().get("feedback");
  const detail = <FeedbackDetail id={feedbackId} onClose={() => router.replace("/inbox", { scroll: false })} />;

  if (!items) {
    return (
      <>
        <PageHeader title="Inbox" />
        <div className="m-3.5 h-[320px] rounded-xl bg-card-2 md:m-5" aria-busy="true" aria-label="Inbox lädt" />
        {detail}
      </>
    );
  }

  const days = [...new Set(items.map((n) => dayLabel(n.created_at)))];
  const markAll = () =>
    setRead(
      items.filter((n) => !n.read_at).map((n) => n.id),
      true
    );

  return (
    <div className="flex flex-col">
      <PageHeader title="Inbox" />
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4 px-3.5 pt-2 pb-8 md:px-6 md:pt-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="mr-auto text-[21px] font-semibold tracking-[-0.025em] md:sr-only">Inbox</h1>
          {unread > 0 && (
            <button
              type="button"
              onClick={markAll}
              className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-[9px] px-3 text-[13px] font-medium text-fg-2 shadow-[inset_0_0_0_1px_var(--line2)] transition-colors duration-150 hover:bg-hover hover:text-fg max-md:h-10"
            >
              <CheckCheck className="size-3.5" aria-hidden />
              Alle gelesen
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2.5 rounded-[14px] bg-card-2 px-4 py-12 text-center max-md:bg-card max-md:shadow-card">
            <p className="text-sm font-medium">Noch nichts in deiner Inbox</p>
          </div>
        ) : (
          days.map((day) => (
            <section key={day} className="flex flex-col gap-2">
              <h2 className="label-mono px-1">{day}</h2>
              <ul className="overflow-hidden rounded-xl bg-card shadow-card">
                {items
                  .filter((n) => dayLabel(n.created_at) === day)
                  .map((n) => (
                    <InboxRow key={n.id} item={n} onRead={(read) => setRead([n.id], read)} />
                  ))}
              </ul>
            </section>
          ))
        )}
      </div>
      {detail}
    </div>
  );
}

function InboxRow({ item: n, onRead }: { item: InboxItem; onRead: (read: boolean) => void }) {
  const { personById } = useTeam();
  const [copied, setCopied] = useState(false);
  const actor = personById(n.actor_id);
  const unread = !n.read_at;
  const gone = n.targetName === null;
  const what =
    n.kind === "mention"
      ? "hat dich erwähnt"
      : n.kind === "feedback"
        ? "hat Feedback gegeben"
        : n.kind === "feedback_done"
          ? "hat dein Feedback umgesetzt"
          : n.target_type === "meeting"
            ? "hat dich eingetragen"
            : "hat dich zugewiesen";
  const status = n.target_type === "feedback" ? (n.targetStatus as FeedbackStatus | null) : null;

  const copy = async () => {
    await navigator.clipboard.writeText(window.location.origin + n.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <li className={cn("relative flex items-start gap-3 border-t border-line px-3.5 py-3 first:border-t-0", !gone && "hover:bg-hover")}>
      <span className={cn("mt-[17px] size-2 shrink-0 rounded-full", unread ? "bg-acc-line" : "bg-transparent")} aria-hidden />
      <Avatar person={actor} size={26} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className={cn("text-[14px] leading-snug md:text-[13.5px]", unread ? "text-fg" : "text-fg-2")}>
          {unread && <span className="sr-only">Ungelesen: </span>}
          <b className={cn(unread ? "font-semibold" : "font-medium")}>{actor?.name ?? "Jemand"}</b> {what}
          <span className="text-fg-3"> · {format(parseISO(n.created_at), "HH:mm")}</span>
        </p>
        {gone ? (
          <span className="text-[13px] text-fg-3">{TARGET_NAMES[n.target_type]} nicht mehr vorhanden</span>
        ) : (
          <Link
            href={n.href}
            scroll={false}
            onClick={() => unread && onRead(true)}
            className="min-w-0 truncate rounded-sm text-[14px] font-medium after:absolute after:inset-0 md:text-[13.5px]"
          >
            <span className="font-normal text-fg-3">{TARGET_NAMES[n.target_type]} · </span>
            {n.targetName}
          </Link>
        )}
        {status && n.kind === "feedback" && (
          <Chip tone={STATUS_TONE[status]} still className="self-start">
            {STATUS_LABEL[status]}
          </Chip>
        )}
        {n.body && <p className="line-clamp-2 text-[13px] leading-normal text-fg-2">„{n.body}“</p>}
      </div>
      <div className="flex shrink-0 items-center">
        {!gone && (
          <button type="button" onClick={copy} className={iconBtn} aria-label="Link für WhatsApp kopieren" title="Link kopieren">
            {copied ? <Check className="size-4 text-st-green" aria-hidden /> : <Link2 className="size-4" aria-hidden />}
            <span className="sr-only" aria-live="polite">
              {copied ? "Kopiert" : ""}
            </span>
          </button>
        )}
        <button
          type="button"
          onClick={() => onRead(unread)}
          className={cn(iconBtn, "max-md:hidden")}
          aria-label={unread ? "Als gelesen markieren" : "Als ungelesen markieren"}
          title={unread ? "Als gelesen markieren" : "Als ungelesen markieren"}
        >
          {unread ? <Check className="size-4" aria-hidden /> : <Mail className="size-4" aria-hidden />}
        </button>
      </div>
    </li>
  );
}
