"use client";

import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Person = { name: string; initials: string; color: string };

// Angemeldete Person mit Abmelden-Knopf. Wird in den App-Rahmen (Sidebar unten) wandern.
export function UserBadge() {
  const [person, setPerson] = useState<Person | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: p } = await supabase
        .from("people")
        .select("name, initials, color")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (p) setPerson(p);
    });
  }, []);

  if (!person) return null;

  return (
    <div className="flex items-center gap-2">
      <span
        className="grid size-7 place-items-center rounded-full text-[11px] font-semibold text-[#111]"
        style={{ background: person.color }}
        aria-hidden
      >
        {person.initials}
      </span>
      <span className="text-[13px] text-fg-2">{person.name}</span>
      <form action="/auth/signout" method="post">
        <button
          type="submit"
          aria-label="Abmelden"
          title="Abmelden"
          className="grid size-7 place-items-center rounded-md text-fg-3 transition-colors duration-150 hover:bg-hover hover:text-fg"
        >
          <LogOut className="size-3.5" aria-hidden />
        </button>
      </form>
    </div>
  );
}
