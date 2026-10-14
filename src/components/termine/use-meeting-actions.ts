"use client";

import { useToast } from "@/components/toast";
import { useTeam } from "@/components/app-shell/team-provider";
import { logActivity, notifyAssignment } from "@/lib/data/use-feed";
import { attendeeEmails, type useMeetings } from "@/lib/data/use-meetings";
import type { useTasks } from "@/lib/data/use-tasks";
import { formatShort } from "@/lib/dates";
import { fromVienna, googleCalendarUrl, meetingHref, openItems, plusDays, viennaParts, type Meeting, type MeetingPatch } from "@/lib/meetings";
import type { NewMeetingInput } from "./new-meeting-dialog";

// Termin-Aktionen mit Hinweis + „Rückgängig“. Wer eingetragen wird, bekommt einen Inbox-Eintrag (wie bei Zuweisungen).
// Hängt eine Firma am Termin, steht er in deren Verlauf.

export function useMeetingActions(
  api: Pick<ReturnType<typeof useMeetings>, "create" | "update" | "remove" | "restore">,
  tasksApi: Pick<ReturnType<typeof useTasks>, "tasks" | "update">,
  opts: { onOpen?: (m: Meeting) => void } = {}
) {
  const toast = useToast();
  const { me } = useTeam();
  const meId = me?.id ?? null;

  const notify = (m: Meeting, ids: string[]) => ids.forEach((id) => notifyAssignment("meeting", m.id, meId, id));
  const linkOrg = (m: Meeting, orgId: string | null) =>
    orgId && logActivity("organization", orgId, meId, "meeting_linked", { meeting_id: m.id, title: m.title, starts_at: m.starts_at });

  const created = (m: Meeting, text: string) => {
    logActivity("meeting", m.id, meId, "created");
    notify(m, m.attendees);
    linkOrg(m, m.organization_id);
    opts.onOpen?.(m);
    toast({ text });
  };

  const create = async (input: NewMeetingInput & { organization_id?: string | null }) => {
    const { date, time, ...rest } = input;
    const m = await api.create({ ...rest, starts_at: fromVienna(date, time), created_by: meId });
    if (!m) return false;
    created(m, `„${m.title}“ angelegt`);
    return true;
  };

  const update = (m: Meeting, patch: MeetingPatch) => {
    api.update(m.id, patch);
    if (patch.attendees) notify(m, patch.attendees.filter((id) => !m.attendees.includes(id)));
    if (patch.organization_id !== undefined && patch.organization_id !== m.organization_id) linkOrg({ ...m, ...patch }, patch.organization_id);
  };

  /** Löschen mit „Rückgängig“: gleiche ID, Kommentare, Unterlagen und Entscheidungen bleiben verknüpft, Aufgaben werden neu verknüpft. */
  const remove = (m: Meeting) => {
    const linked = (tasksApi.tasks ?? []).filter((t) => t.meeting_id === m.id).map((t) => t.id);
    api.remove(m);
    toast({
      text: `„${m.title}“ gelöscht`,
      onAction: async () => {
        await api.restore(m);
        linked.forEach((id) => tasksApi.update(id, { meeting_id: m.id }));
      },
    });
  };

  /** „Nächster Termin“: +7 Tage, gleiche Leute, Agenda als Vorlage, offene Punkte aus den Notizen wandern mit. */
  const createNext = async (m: Meeting) => {
    const start = viennaParts(m.starts_at);
    const date = plusDays(start.date, 7);
    const carry = openItems(m.notes).filter((x) => !openItems(m.agenda).includes(x));
    const agenda = [m.agenda.trim(), carry.length ? `**Offen vom ${formatShort(start.date)}**\n\n${carry.map((x) => `- [ ] ${x}`).join("\n")}` : ""]
      .filter(Boolean)
      .join("\n\n");
    const next = await api.create({
      title: m.title,
      starts_at: fromVienna(date, start.time),
      duration_min: m.duration_min,
      location: m.location,
      meet_url: m.meet_url,
      area_id: m.area_id,
      organization_id: m.organization_id,
      attendees: m.attendees,
      agenda,
      created_by: meId,
    });
    if (!next) {
      toast({ text: "Hat nicht geklappt. Bitte nochmal versuchen." });
      return;
    }
    logActivity("meeting", m.id, meId, "next_created", { meeting_id: next.id });
    created(next, `Nächster Termin am ${formatShort(date)} angelegt`);
  };

  /** Google Kalender mit vorausgefülltem Termin öffnen (Gäste = Team-Adressen der Teilnehmenden). */
  const openCalendar = async (m: Meeting) => {
    // Fenster sofort öffnen, sonst blockiert der Browser es nach dem Laden der Adressen.
    const win = window.open("", "_blank");
    const guests = await attendeeEmails(m.attendees);
    const url = googleCalendarUrl(m, { link: window.location.origin + meetingHref(m.id), guests });
    if (win) {
      win.opener = null;
      win.location.href = url;
    } else window.open(url, "_blank", "noopener,noreferrer");
  };

  return { create, update, remove, createNext, openCalendar };
}
