import { Hammer } from "lucide-react";
import { PageHeader } from "./page-header";

// Platzhalter für Seiten, die im Bauplan noch kommen. Wird Seite für Seite ersetzt.
export function ComingSoon({ title, note }: { title: string; note: string }) {
  return (
    <>
      <PageHeader title={title} />
      <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-5 px-3.5 pt-2 pb-8 md:px-8 md:pt-8">
        <h1 className="text-[21px] font-semibold tracking-[-0.025em] md:text-[26px]">{title}</h1>
        <div className="flex flex-col items-center gap-2.5 rounded-[14px] bg-card-2 px-4 py-12 text-center">
          <div className="grid size-10 place-items-center rounded-xl text-fg-2 shadow-[inset_0_0_0_1px_var(--line2)]">
            <Hammer className="size-[18px]" strokeWidth={1.8} aria-hidden />
          </div>
          <div className="text-sm font-medium">Kommt bald</div>
          <p className="max-w-[320px] text-[13px] leading-normal text-fg-2">{note}</p>
        </div>
      </div>
    </>
  );
}
