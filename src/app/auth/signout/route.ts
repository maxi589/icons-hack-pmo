import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  // Nur dieses Gerät abmelden. Standard wäre „global“ und würde alle Geräte der Person abmelden.
  await supabase.auth.signOut({ scope: "local" });
  return NextResponse.redirect(`${request.nextUrl.origin}/login`, { status: 303 });
}
