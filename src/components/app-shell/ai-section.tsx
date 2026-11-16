"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Plus } from "lucide-react";
import { useToast } from "@/components/toast";
import { createMcpToken, listMcpTokens, revokeMcpToken, type McpToken } from "@/lib/mcp-actions";
import { formatShort } from "@/lib/dates";
import { viennaParts } from "@/lib/meetings";

// Profil → „KI verbinden“ (16.11.): eigener Schlüssel für Claude, ChatGPT & Co. (MCP, docs/MCP.md).
// Die Adresse mit Schlüssel gibt es nur direkt nach dem Anlegen; danach nur Name, Kennung und „zuletzt genutzt“.

const field =
  "h-10 w-full min-w-0 rounded-[9px] border border-field bg-card px-3 text-[14px] text-fg placeholder:text-fg-3 focus-visible:outline-solid max-md:text-base";
const ghostBtn =
  "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-fg-2 transition-colors duration-150 hover:bg-hover hover:text-fg max-md:h-11";
const primaryBtn =
  "h-9 shrink-0 rounded-[9px] bg-acc px-3.5 text-[13.5px] font-medium text-acc-text transition-[scale,opacity] duration-150 active:scale-[.97] disabled:opacity-50 max-md:h-11";

export function AiSection() {
  const toast = useToast();
  const [tokens, setTokens] = useState<McpToken[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await listMcpTokens();
    if (res.ok) setTokens(res.data);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- einmal beim Öffnen laden
    load();
  }, [load]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ text: "Adresse kopiert" });
    } catch {
      toast({ text: "Kopieren ging nicht. Bitte markieren und kopieren.", error: true });
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await createMcpToken(name);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    const u = `${window.location.origin}/api/mcp/${res.data.token}`;
    setUrl(u);
    setAdding(false);
    setName("");
    await load();
    copy(u);
  };

  const revoke = async (t: McpToken) => {
    const res = await revokeMcpToken(t.id);
    if (!res.ok) return toast({ text: res.error, error: true });
    await load();
    toast({ text: `„${t.name}“ widerrufen` });
  };

  return (
    <section className="flex flex-col gap-1.5">
      <div className="flex min-h-8 items-center justify-between">
        <h3 className="label-mono">KI verbinden</h3>
        {!adding && (
          <button type="button" onClick={() => (setAdding(true), setUrl(null))} className={ghostBtn}>
            <Plus className="size-4" strokeWidth={1.8} aria-hidden />
            Schlüssel
          </button>
        )}
      </div>

      {adding && (
        <form onSubmit={submit} className="mb-1.5 flex gap-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Wofür? z. B. Claude"
            aria-label="Name des Schlüssels"
            maxLength={40}
            className={field}
          />
          <button type="button" onClick={() => (setAdding(false), setError(null))} className={ghostBtn}>
            Abbrechen
          </button>
          <button type="submit" disabled={busy} className={primaryBtn}>
            Anlegen
          </button>
        </form>
      )}
      {error && (
        <p role="alert" className="text-[13px] text-st-red">
          {error}
        </p>
      )}

      {url && (
        <div className="mb-1.5 flex flex-col gap-2 rounded-[9px] border border-line bg-card-2 p-3">
          <p className="text-[13px] text-fg-2">Nur jetzt sichtbar. In Claude unter Konnektoren als eigenen Konnektor einfügen.</p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-fg" title={url}>
              {url}
            </code>
            <button type="button" onClick={() => copy(url)} className={ghostBtn}>
              <Copy className="size-3.5" strokeWidth={1.8} aria-hidden />
              Kopieren
            </button>
          </div>
        </div>
      )}

      {tokens && tokens.length > 0 && (
        <ul className="flex flex-col">
          {tokens.map((t) => (
            <li key={t.id} className="flex min-h-11 items-center gap-3">
              <span className="truncate text-[13.5px] text-fg">{t.name}</span>
              <span className="tabular text-[13px] text-fg-3">…{t.kennung}</span>
              <span className="flex-1 truncate text-[12.5px] text-fg-3">
                {t.last_used_at ? `genutzt ${formatShort(viennaParts(t.last_used_at).date)}` : "noch nicht genutzt"}
              </span>
              <button type="button" onClick={() => revoke(t)} className={ghostBtn}>
                Widerrufen
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
