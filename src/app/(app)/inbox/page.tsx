import { Suspense } from "react";
import type { Metadata } from "next";
import { Inbox } from "@/components/inbox/inbox";

export const metadata: Metadata = { title: "Inbox" };

// Suspense, weil die Seite das offene Feedback aus der Adresse liest (?feedback=…).
export default function InboxPage() {
  return (
    <Suspense fallback={<div className="m-3.5 h-[320px] rounded-xl bg-card-2 md:m-5" aria-busy="true" />}>
      <Inbox />
    </Suspense>
  );
}
