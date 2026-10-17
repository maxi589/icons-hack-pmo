"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Check, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Avatar } from "@/components/avatar";
import { CopyLinkButton } from "@/components/copy-link-button";
import { useToast } from "@/components/toast";
import { createClient } from "@/lib/supabase/client";
import { changePassword, invitePerson } from "@/lib/account-actions";
import { MIN_PASSWORD } from "@/lib/auth";
import { SoundToggle } from "@/components/sound-toggle";
import { useTeam } from "./team-provider";

// Profil (Klick auf den eigenen Avatar, Strg+K „Profil“, Handy-Menü): Passwort ändern und Team mit Einladen.
// Einmal im App-Rahmen eingebaut, geöffnet von überall mit openProfile().

let isOpen = false;
const listeners = new Set<() => void>();
const setOpen = (o: boolean) => {
  isOpen = o;
  listeners.forEach((l) => l());
};
export const openProfile = () => setOpen(true);
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

type Member = { id: string; name: string; initials: string; color: string; email: string; user_id: string | null };

const field =
  "h-10 w-full min-w-0 rounded-[9px] border border-field bg-card px-3 text-[14px] text-fg placeholder:text-fg-3 focus-visible:outline-solid max-md:text-base";
const ghostBtn =
  "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-fg-2 transition-colors duration-150 hover:bg-hover hover:text-fg max-md:h-11";
const primaryBtn =
  "h-9 shrink-0 rounded-[9px] bg-acc px-3.5 text-[13.5px] font-medium text-acc-text transition-[scale,opacity] duration-150 active:scale-[.97] disabled:opacity-50 max-md:h-11";

export function ProfileDialog() {
  const open = useSyncExternalStore(subscribe, () => isOpen, () => false);
  const { me } = useTeam();
  const [members, setMembers] = useState<Member[]>([]);

  const load = useCallback(async () => {
    const { data } = await createClient().from("people").select("id, name, initials, color, email, user_id").order("sort");
    if (data) setMembers(data.map((m) => ({ ...m, color: `var(--avatar-${m.initials.toLowerCase()}, ${m.color})` })));
  }, []);

  // Beim Öffnen frisch laden (wer hat inzwischen ein Konto?).
  useEffect(
    () =>
      subscribe(() => {
        if (isOpen) load();
      }),
    [load]
  );

  const mine = members.find((m) => m.id === me?.id);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* grid-cols-1 (= minmax(0, 1fr)): lange Mails kürzen statt seitlich überlaufen (Handy) */}
      <DialogContent className="max-h-[92dvh] grid-cols-1 gap-6 overflow-y-auto p-5 sm:max-w-[480px]">
        <div className="flex items-center gap-3 pr-8">
          <Avatar person={me} size={40} />
          <div className="min-w-0">
            <DialogTitle className="text-base font-semibold">{me?.name ?? "Profil"}</DialogTitle>
            <p className="truncate text-[13px] text-fg-3">{mine?.email ?? " "}</p>
          </div>
        </div>
        <section className="flex items-center justify-between gap-3">
          <h3 className="label-mono">Töne auf diesem Gerät</h3>
          <SoundToggle />
        </section>
        <PasswordSection key={open ? "open" : "closed"} />
        <TeamSection key={open ? "team-open" : "team-closed"} members={members} meId={me?.id} onInvited={load} />
      </DialogContent>
    </Dialog>
  );
}

function PasswordSection() {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setEditing(false);
    setCurrent("");
    setNext("");
    setRepeat("");
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== repeat) return setError("Die neuen Passwörter sind nicht gleich.");
    if (next.length < MIN_PASSWORD) return setError(`Mindestens ${MIN_PASSWORD} Zeichen.`);
    setBusy(true);
    setError(null);
    const res = await changePassword(current, next);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    reset();
    toast({ text: "Passwort geändert" });
  };

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex min-h-8 items-center justify-between">
        <h3 className="label-mono">Passwort</h3>
        {!editing && (
          <button type="button" onClick={() => setEditing(true)} className={ghostBtn}>
            Ändern
          </button>
        )}
      </div>
      {editing && (
        <form onSubmit={submit} className="flex flex-col gap-2.5">
          <input
            type="password"
            autoComplete="current-password"
            autoFocus
            required
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="Aktuelles Passwort"
            aria-label="Aktuelles Passwort"
            className={field}
          />
          <div className="grid gap-2.5 sm:grid-cols-2">
            <input
              type="password"
              autoComplete="new-password"
              required
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder="Neues Passwort"
              aria-label="Neues Passwort"
              className={field}
            />
            <input
              type="password"
              autoComplete="new-password"
              required
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
              placeholder="Wiederholen"
              aria-label="Neues Passwort wiederholen"
              className={field}
            />
          </div>
          {error && (
            <p role="alert" className="text-[13px] text-st-red">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-1.5">
            <button type="button" onClick={reset} className={ghostBtn}>
              Abbrechen
            </button>
            <button type="submit" disabled={busy || !current || !next || !repeat} className={primaryBtn}>
              Speichern
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function TeamSection({ members, meId, onInvited }: { members: Member[]; meId?: string; onInvited: () => Promise<void> }) {
  const toast = useToast();
  const { reloadPeople } = useTeam();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setAdding(false);
    setName("");
    setEmail("");
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await invitePerson(name, email);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    const who = name.trim();
    reset();
    await Promise.all([onInvited(), reloadPeople()]);
    toast({ text: `${who} ist eingeladen` });
  };

  return (
    <section className="flex flex-col gap-1.5">
      <div className="flex min-h-8 items-center justify-between">
        <h3 className="label-mono">
          Team <span className="tabular">· {members.length || ""}</span>
        </h3>
        <div className="flex items-center gap-0.5">
          <CopyLinkButton path="/login" label="Link zum Tool kopieren" />
          {!adding && (
            <button type="button" onClick={() => setAdding(true)} className={ghostBtn}>
              <Plus className="size-4" strokeWidth={1.8} aria-hidden />
              Einladen
            </button>
          )}
        </div>
      </div>

      {adding && (
        <form onSubmit={submit} className="mb-1.5 flex flex-col gap-2.5">
          <div className="grid gap-2.5 sm:grid-cols-[1fr_1.6fr]">
            <input
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              aria-label="Name"
              maxLength={40}
              className={field}
            />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Mail"
              aria-label="Mail"
              autoComplete="off"
              className={field}
            />
          </div>
          {error && (
            <p role="alert" className="text-[13px] text-st-red">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-1.5">
            <button type="button" onClick={reset} className={ghostBtn}>
              Abbrechen
            </button>
            <button type="submit" disabled={busy || !name.trim() || !email.trim()} className={primaryBtn}>
              Einladen
            </button>
          </div>
        </form>
      )}

      <ul className="flex flex-col">
        {members.map((m) => (
          <li key={m.id} className="flex min-h-11 items-center gap-3">
            <Avatar person={m} />
            <div className="flex min-w-0 flex-1 items-baseline gap-2">
              <span className="truncate text-[13.5px] text-fg">{m.name}</span>
              <span className="flex-1 truncate text-[13px] text-fg-3">{m.email}</span>
            </div>
            {/* Konto entsteht erst beim ersten Anmelden, user_id gesetzt = hat sich schon angemeldet. */}
            {m.id === meId ? (
              <span className="shrink-0 text-[12.5px] text-fg-3">du</span>
            ) : m.user_id ? (
              <span className="inline-flex shrink-0 items-center gap-1 text-[12.5px] text-st-green">
                <Check className="size-3.5" strokeWidth={2.4} aria-hidden />
                angemeldet
              </span>
            ) : (
              <span className="shrink-0 whitespace-nowrap text-[12.5px] text-fg-3">noch nicht angemeldet</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
