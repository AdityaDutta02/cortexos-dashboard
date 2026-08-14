"use client";

import type { ReactNode } from "react";
import { useId, useState } from "react";
import { cn } from "@/lib/format";

/**
 * Tooltip — hover and focus triggered, described by `aria-describedby` so the
 * content is announced rather than being decoration. Use for the definition of
 * a term (`proposed`, `trickle`), never to hide something the user needs.
 */
export function Tooltip({
  content,
  children,
  side = "top",
  className,
}: {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={() => setOpen(false)}
    >
      <span aria-describedby={open ? id : undefined} className="inline-flex">
        {children}
      </span>
      {open ? (
        <span
          role="tooltip"
          id={id}
          className={cn(
            "pointer-events-none absolute left-1/2 z-50 w-max max-w-[280px] -translate-x-1/2 border border-border-strong bg-bg px-2.5 py-1.5 font-body text-[12.5px] leading-[18px] text-text shadow-[0_8px_24px_-12px_rgba(11,16,21,0.5)]",
            side === "top" ? "bottom-full mb-2" : "top-full mt-2",
          )}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}

/** A dotted-underline term that carries a Tooltip. Used for jargon in copy. */
export function Term({ definition, children }: { definition: ReactNode; children: ReactNode }) {
  return (
    <Tooltip content={definition}>
      <span
        tabIndex={0}
        className="cursor-help border-b border-dotted border-text-dim text-text-muted"
      >
        {children}
      </span>
    </Tooltip>
  );
}
