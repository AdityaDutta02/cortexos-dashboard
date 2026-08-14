"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/format";

export type ToastTone = "info" | "ok" | "warn" | "danger";

export interface Toast {
  id: string;
  tone: ToastTone;
  message: string;
  /** Optional inline action, e.g. "Undo" or "View run". */
  action?: { label: string; onClick: () => void };
  /** ms before auto-dismiss. 0 pins it until dismissed. */
  duration?: number;
}

interface ToastContextValue {
  toast: (t: Omit<Toast, "id">) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE: Record<ToastTone, string> = {
  info: "border-border bg-bg text-text",
  ok: "border-ok/40 bg-ok-tint text-text",
  warn: "border-warn/40 bg-warn-tint text-text",
  danger: "border-danger/40 bg-danger-tint text-text",
};

/**
 * Hosts the toast stack. Mount once, near the root of the shell. Toasts are
 * announcements, never the only place an outcome is reported — the run log is.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    setItems((list) => [...list, { ...t, id }]);
    return id;
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed right-4 bottom-4 z-200 flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2"
      >
        {items.map((t) => (
          <ToastRow key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastRow({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const duration = toast.duration ?? 5000;
  useEffect(() => {
    if (duration <= 0) return;
    const id = window.setTimeout(() => onDismiss(toast.id), duration);
    return () => window.clearTimeout(id);
  }, [duration, toast.id, onDismiss]);

  return (
    <div
      role="status"
      data-testid="toast"
      className={cn(
        "animate-fade-up pointer-events-auto flex items-start gap-3 border px-4 py-3 shadow-[0_12px_32px_-16px_rgba(11,16,21,0.4)]",
        TONE[toast.tone],
      )}
    >
      <p className="flex-1 font-body text-[13.5px] leading-[20px]">{toast.message}</p>
      {toast.action ? (
        <button
          type="button"
          onClick={() => {
            toast.action?.onClick();
            onDismiss(toast.id);
          }}
          className="font-body text-[13px] font-medium text-blue underline underline-offset-2"
        >
          {toast.action.label}
        </button>
      ) : null}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => onDismiss(toast.id)}
        className="text-text-dim transition-colors hover:text-text"
      >
        ✕
      </button>
    </div>
  );
}

/** Fire a toast. Throws outside ToastProvider — that is a wiring bug. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
