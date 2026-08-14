"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useId, useRef } from "react";
import { cn } from "@/lib/format";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Dialog — a modal with a real focus trap, Escape-to-close, and focus
 * returned to the trigger on unmount. The pre-flight confirm on Home is the
 * spec-critical use, so this must be keyboard-complete.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  footer,
  children,
  width = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  footer?: ReactNode;
  children?: ReactNode;
  width?: "sm" | "md" | "lg";
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown, true);
    const t = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    }, 0);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(t);
      restoreRef.current?.focus();
    };
  }, [open, onKeyDown]);

  if (!open) return null;

  const widthClass = width === "sm" ? "max-w-[420px]" : width === "lg" ? "max-w-[760px]" : "max-w-[560px]";

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-text/30 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        data-testid="dialog"
        className={cn(
          "animate-fade-up relative w-full border border-border-strong bg-bg shadow-[0_24px_60px_-24px_rgba(11,16,21,0.45)]",
          widthClass,
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border bg-strip px-5 py-4">
          <div className="flex flex-col gap-1.5">
            <h2 id={titleId} className="font-heading text-[19px] font-medium text-text">
              {title}
            </h2>
            {description ? (
              <p id={descId} className="font-body text-[13.5px] leading-[21px] text-text-muted">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mt-1 -mr-1 flex h-8 w-8 shrink-0 items-center justify-center border border-transparent text-text-muted transition-colors hover:border-border hover:text-text"
          >
            ✕
          </button>
        </header>
        {children ? <div className="px-5 py-5">{children}</div> : null}
        {footer ? (
          <footer className="flex items-center justify-end gap-2 border-t border-border bg-strip px-5 py-3.5">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
