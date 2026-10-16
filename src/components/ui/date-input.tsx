"use client";

import { useEffect, useState, type InputHTMLAttributes } from "react";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { formatShort, todayInVienna } from "@/lib/dates";

// Datumsfeld im Format des Tools („Mo, 19.10.“ statt „19.10.2026“ des Browsers). Darüber liegt unsichtbar das echte
// <input type="date">: Klick oder Tippen öffnet den Kalender des Systems, gespeichert wird wie bisher über onChange.
// Mit der Tastatur angesteuert (Tab) oder sobald jemand Ziffern/Pfeile tippt, erscheint das Eingabefeld selbst.

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "className" | "placeholder"> & {
  value: string;
  /** Text bei leerem Datum */
  placeholder?: string;
  /** Klassen für die sichtbare Fläche (Höhe, Rand, Abstand, Schrift, Farbe) */
  className?: string;
};

const NOT_TYPING = new Set(["Tab", "Shift", "Escape", "Enter", "Control", "Alt", "Meta"]);

// Kam der Fokus von Maus/Finger (auch über die Beschriftung)? Dann bleibt das Format des Tools stehen.
let lastPointer = 0;
let listening = false;

/** „Mo, 19.10.“, mit Jahr, wenn das Datum mehr als ein halbes Jahr von heute weg ist; ungültiges als Rohtext. */
function label(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(parseISO(value).getTime())) return value;
  const far = Math.abs(differenceInCalendarDays(parseISO(value), parseISO(todayInVienna()))) > 183;
  return far ? format(parseISO(value), "EEEEEE, d.M.yyyy", { locale: de }) : formatShort(value);
}

export function DateInput({ value, placeholder = "–", className, max = "9999-12-31", onKeyDown, onFocus, onBlur, onClick, ...rest }: Props) {
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    if (listening) return;
    listening = true;
    window.addEventListener("pointerdown", () => (lastPointer = Date.now()), true);
  }, []);
  return (
    <span
      className={cn(
        "relative flex min-w-0 cursor-pointer items-center tabular",
        "has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-acc-line has-[input:focus-visible]:outline-solid",
        className
      )}
    >
      <span aria-hidden className={cn("truncate", !value && "text-fg-3", typing && "hidden")}>
        {value ? label(value) : placeholder}
      </span>
      <input
        {...rest}
        type="date"
        value={value}
        // Ohne Obergrenze erlaubt der Browser 5–6-stellige Jahre (Tippfehler), daher höchstens 9999
        max={max}
        onFocus={(e) => {
          if (Date.now() - lastPointer > 600) setTyping(true);
          onFocus?.(e);
        }}
        onKeyDown={(e) => {
          if (!NOT_TYPING.has(e.key)) setTyping(true);
          onKeyDown?.(e);
        }}
        onBlur={(e) => {
          setTyping(false);
          onBlur?.(e);
        }}
        onClick={(e) => {
          try {
            e.currentTarget.showPicker();
          } catch {
            // ältere Browser: Tippen ins Feld geht weiterhin
          }
          onClick?.(e);
        }}
        className={cn(
          "min-w-0 cursor-pointer bg-transparent [color:inherit] [font:inherit] outline-none [&::-webkit-calendar-picker-indicator]:hidden",
          typing ? "w-full" : "absolute inset-0 size-full opacity-0"
        )}
      />
    </span>
  );
}
