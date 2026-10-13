import { createBrowserClient } from "@supabase/ssr";

// Supabase im Browser. Daten laufen über Row Level Security, deshalb reicht der öffentliche Schlüssel.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
