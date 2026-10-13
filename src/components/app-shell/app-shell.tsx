import { ThemeSync } from "@/components/theme-toggle";
import { ToastProvider } from "@/components/toast";
import { CommandProvider } from "./command-palette";
import { MobileHeader, MobileTabBar } from "./mobile-nav";
import { Sidebar } from "./sidebar";
import { TeamProvider } from "./team-provider";

// App-Rahmen (Design-System, Abschnitt 5).
// Desktop: Sidebar links, Hauptpanel eingerückt (8px), Radius 14, Ring; nur das Panel scrollt.
// Handy: Kopfzeile oben, Inhalt, Tab-Leiste unten (fest, mit Abstand für die Home-Leiste).
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <TeamProvider>
      <CommandProvider>
        <ToastProvider>
          <ThemeSync />
          <div className="flex min-h-dvh flex-1 bg-bg md:h-dvh md:min-h-0">
            <Sidebar />
            <div className="flex min-w-0 flex-1 flex-col md:p-2 md:pl-0">
              <MobileHeader />
              <main className="flex min-w-0 flex-1 flex-col pb-[calc(76px+env(safe-area-inset-bottom))] md:overflow-y-auto md:rounded-[14px] md:bg-panel md:pb-0 md:shadow-[0_0_0_1px_var(--line)]">
                {children}
              </main>
            </div>
          </div>
          <MobileTabBar />
        </ToastProvider>
      </CommandProvider>
    </TeamProvider>
  );
}
