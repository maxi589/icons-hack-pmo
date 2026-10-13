import { AppShell } from "@/components/app-shell/app-shell";

// Alle Seiten nach dem Login teilen sich den App-Rahmen. /login liegt außerhalb dieser Gruppe.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return <AppShell>{children}</AppShell>;
}
