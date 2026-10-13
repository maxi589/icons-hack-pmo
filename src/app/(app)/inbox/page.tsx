import type { Metadata } from "next";
import { ComingSoon } from "@/components/app-shell/coming-soon";

export const metadata: Metadata = { title: "Inbox · icons Hackathon PMO" };

export default function InboxPage() {
  return <ComingSoon title="Inbox" note="Hier landen Erwähnungen und Zuweisungen, mit „Link kopieren“ für WhatsApp." />;
}
