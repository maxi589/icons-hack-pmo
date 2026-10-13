"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";

// Hinweis unten mittig, z. B. „Nordwerk → Kontaktiert · Rückgängig“ (Design-System 6.3).
// 5 Sekunden mit Ablauf-Linie, ersetzt Sicherheitsfragen. Immer nur ein Hinweis gleichzeitig.

type Toast = { text: string; actionLabel?: string; onAction?: () => void; onExpire?: () => void };

const ToastContext = createContext<(t: Toast) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

const DURATION = 5000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<(Toast & { key: number }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const current = useRef<Toast | null>(null);

  const finish = useCallback((runExpire: boolean) => {
    if (timer.current) clearTimeout(timer.current);
    if (runExpire) current.current?.onExpire?.();
    current.current = null;
    setToast(null);
  }, []);

  const show = useCallback(
    (t: Toast) => {
      // Ein laufender Hinweis gilt als abgelaufen, sobald ein neuer kommt.
      if (current.current) finish(true);
      current.current = t;
      setToast({ ...t, key: Date.now() });
      timer.current = setTimeout(() => finish(true), DURATION);
    },
    [finish]
  );

  // Seite verlassen: offene Hinweise abschließen (z. B. Verlauf schreiben).
  useEffect(() => () => current.current?.onExpire?.(), []);

  return (
    <ToastContext value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(84px+env(safe-area-inset-bottom))] z-[60] flex justify-center px-3 md:bottom-6">
        {toast && (
          <div
            key={toast.key}
            role="status"
            className="pointer-events-auto relative flex max-w-full animate-in items-center gap-3.5 overflow-hidden rounded-xl bg-card-2 py-2.5 pr-3 pl-4 text-[13px] shadow-[0_0_0_1px_var(--line2),0_12px_32px_rgba(0,0,0,.35)] duration-200 fade-in-0 slide-in-from-bottom-2"
          >
            <Check className="size-[15px] shrink-0 text-st-green" strokeWidth={2.4} aria-hidden />
            <span className="min-w-0 truncate">{toast.text}</span>
            {toast.onAction && (
              <button
                type="button"
                onClick={() => {
                  toast.onAction?.();
                  finish(false);
                }}
                className="h-[26px] shrink-0 rounded-[7px] px-2.5 text-[12px] text-fg shadow-[inset_0_0_0_1px_var(--line2)] hover:bg-hover"
              >
                {toast.actionLabel ?? "Rückgängig"}
              </button>
            )}
            <span className="toast-timer absolute bottom-0 left-0 h-0.5 w-full bg-acc-line opacity-70" aria-hidden />
          </div>
        )}
      </div>
    </ToastContext>
  );
}
