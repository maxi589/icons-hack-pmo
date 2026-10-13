import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth";

// Google schickt nach der Anmeldung hierher zurück. Code gegen Sitzung tauschen,
// dann prüfen, ob die Adresse auf der Allowlist steht.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (!code) {
    // Lehnt der Auth-Hook die Adresse ab, kommt statt des Codes eine Fehlermeldung zurück.
    const desc = searchParams.get("error_description") ?? "";
    const denied = /zugang|403|not allowed/i.test(desc);
    return NextResponse.redirect(`${origin}/login?fehler=${denied ? "kein-zugang" : "abgebrochen"}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    // Der Auth-Hook lehnt Adressen außerhalb der Allowlist schon beim Anlegen des Kontos ab.
    const denied = /zugang|403|not allowed/i.test(error.message);
    return NextResponse.redirect(`${origin}/login?fehler=${denied ? "kein-zugang" : "anmeldung"}`);
  }

  const { data: isMember } = await supabase.rpc("is_team_member");
  if (!isMember) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?fehler=kein-zugang`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
