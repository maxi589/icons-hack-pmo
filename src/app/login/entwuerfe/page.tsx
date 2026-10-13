import type { Metadata } from "next";
import { Drafts } from "./drafts";

// Vorübergehend: Entwürfe für die Login-Seite zum Vergleichen. Nach der Entscheidung löschen.
export const metadata: Metadata = { title: "Login-Entwürfe · icons Hackathon PMO" };

export default function Page() {
  return <Drafts />;
}
