"use client";

import { useEffect, useState } from "react";
import { daysUntil, EVENT_START } from "@/lib/dates";

// Tage bis zum Hackathon, gerechnet in Europe/Vienna. Läuft im Browser, damit „heute“ stimmt.
export function Countdown() {
  const [days, setDays] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setDays(daysUntil(EVENT_START));
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="font-display tabular text-[46px] leading-none tracking-[0.01em] md:text-[72px]">
      {days ?? "–"}
    </span>
  );
}
