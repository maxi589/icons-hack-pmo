import "server-only";
import { createClient } from "@supabase/supabase-js";

// Supabase mit dem geheimen Schlüssel: umgeht RLS. Nur auf dem Server und nur für
// eng begrenzte Aufgaben (Konto für eine Person aus der Allowlist anlegen).
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
