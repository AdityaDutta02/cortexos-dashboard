"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/format";

/**
 * Popover — a click-triggered panel anchored to its trigger. Used by the top
 * bar's health and session-stats chips: the chip carries the glanceable value,
 * the popover carries the detail, so nothing verbose sits on the page.
 *
 * Closes on Escape and on outside click. Not modal — it never traps focus,
 * because it is a detail view, not a decision.
 */
export function Popover({
  trigger,
  children,
  align = "end",
  width = 300,
  testId,
}: {
  /** Render-prop so the trigger can show open state. */
  trigger: (props: { open: boolean; toggle: () => void; id: string }) => ReactNode;
  children: ReactNode;
  align?: "start" | "end";
  width?: number;
  testId?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((v) => !v), id })}
      {open ? (
        <div
          id={id}
          data-testid={testId}
          style={{ width }}
          className={cn(
            "animate-fade-up absolute top-[calc(100%+6px)] z-60 max-w-[calc(100vw-1.5rem)] border border-border-strong bg-bg p-3 shadow-[0_18px_44px_-20px_rgba(0,0,0,0.55)]",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
