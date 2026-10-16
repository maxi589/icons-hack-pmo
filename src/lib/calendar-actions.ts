"use server";

import { createClient } from "@/lib/supabase/server";
import { calendarLinkFor } from "@/lib/google-calendar";

// „Zu Google Kalender“ (Seite Termine): Link auf den eigenen Kalender „hack-vienna HQ“ der angemeldeten Person.
// Die Person ermittelt die Datenbank selbst (current_person_id), nicht der Browser.
export async function myCalendarLink(): Promise<string | null> {
  const supabase = await createClient();
  const { data: personId, error } = await supabase.rpc("current_person_id");
  if (error || typeof personId !== "string") return null;
  try {
    return await calendarLinkFor(personId);
  } catch {
    return null;
  }
}
