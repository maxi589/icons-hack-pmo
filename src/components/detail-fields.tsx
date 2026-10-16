"use client";

import { useRef, useState } from "react";
import { Select, type SelectOption } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Bausteine für Detail-Panels (Firma, Aufgabe): Eigenschafts-Zeile, Auswahl, Textfeld, das wie Text
// aussieht und beim Verlassen speichert, kleiner Knopf (z. B. „+2 Tage“).

const selectCls = "h-8 w-full rounded-lg px-2 text-[13px] text-fg hover:bg-hover focus-visible:bg-hover max-md:text-base";

export const miniButton =
  "inline-flex h-[26px] items-center rounded-[7px] px-2.5 text-[12px] text-fg-2 shadow-[inset_0_0_0_1px_var(--line2)] transition-colors duration-150 hover:bg-hover hover:text-fg";

// Beschriftung steht auf Höhe der ersten Zeile (leading-8 = Höhe der Felder), auch wenn der Inhalt umbricht.
export function PropRow({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-9 grid-cols-[112px_minmax(0,1fr)] items-start gap-2.5 py-0.5 text-[13px]">
      {htmlFor ? (
        <label htmlFor={htmlFor} className="leading-8 text-fg-3">
          {label}
        </label>
      ) : (
        <span className="leading-8 text-fg-3">{label}</span>
      )}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function SelectBox({
  id,
  value,
  onChange,
  options,
  searchable,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  /** Suchfeld in der Liste (lange Listen wie Firmen) */
  searchable?: boolean;
}) {
  return <Select id={id} value={value} onChange={onChange} options={options} className={selectCls} searchable={searchable} />;
}

/** Textfeld, das wie Text aussieht und beim Verlassen speichert. */
export function EditText({
  id,
  value,
  placeholder,
  onSave,
  multiline = false,
  wrap = false,
  className,
  required = false,
  inputMode,
}: {
  id: string;
  value: string | null;
  placeholder: string;
  onSave: (v: string | null) => void;
  multiline?: boolean;
  /** Eine Zeile, die bei langem Text umbricht statt abzuschneiden (z. B. Titel). Enter speichert. */
  wrap?: boolean;
  className?: string;
  /** Leeren nicht erlaubt (z. B. Titel): leerer Text stellt den alten Wert wieder her. */
  required?: boolean;
  /** Tastatur am Handy, z. B. "decimal" für Beträge (nur einzeiliges Feld) */
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  const [draft, setDraft] = useState<string | null>(null);
  // Esc verwirft den Entwurf (versehentlich getippt oder eingefügt), das folgende Verlassen speichert dann nichts
  const discard = useRef(false);
  const shown = draft ?? value ?? "";
  const commit = () => {
    if (discard.current) {
      discard.current = false;
      setDraft(null);
      return;
    }
    if (draft === null) return;
    const v = draft.trim() || null;
    if (v !== (value ?? null) && (v || !required)) onSave(v);
    setDraft(null);
  };
  const escape = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key !== "Escape" || draft === null) return false;
    discard.current = true;
    setDraft(null);
    e.currentTarget.blur();
    return true;
  };
  const cls =
    "w-full rounded-lg bg-transparent px-2 text-[13px] text-fg placeholder:text-fg-3 transition-colors duration-150 max-md:text-base hover:bg-hover focus-visible:bg-panel focus-visible:shadow-[inset_0_0_0_1px_var(--field)] focus-visible:outline-none";
  if (wrap)
    return (
      <textarea
        id={id}
        rows={1}
        value={shown}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value.replace(/\n/g, " "))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (escape(e)) return;
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        className={cn(cls, "field-sizing-content min-h-8 resize-none py-1 leading-snug", className)}
      />
    );
  return multiline ? (
    <textarea
      id={id}
      rows={3}
      value={shown}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={escape}
      className={cn(cls, "resize-y py-1.5 leading-normal", className)}
    />
  ) : (
    <input
      id={id}
      value={shown}
      placeholder={placeholder}
      inputMode={inputMode}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => !escape(e) && e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
      className={cn(cls, "h-8", className)}
    />
  );
}
