import { PageHeader } from "@/components/app-shell/page-header";
import { Overview } from "@/components/overview/overview";

export default function OverviewPage() {
  return (
    <>
      <PageHeader title="Übersicht" />
      <Overview />
    </>
  );
}
