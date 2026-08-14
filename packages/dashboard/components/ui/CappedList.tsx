"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/format";

/** Rows shown before the fold on a phone. */
export const CAP = 5;

/**
 * A list that stops at five rows on a phone.
 *
 * WHY ONLY ON A PHONE. At `lg` the dashboard is a fixed-height grid and each
 * module scrolls inside itself, so a long list costs nothing. Below `lg` the
 * rails stack and the page grid becomes the ONE scroll container — so 129
 * skills, 14 connectors and every run render at full height, one after another,
 * and the page becomes several screens of list with the graph pushed off the
 * top. Reported from a phone, 2026-08-13.
 *
 * WHY CSS AND NOT A MEDIA QUERY IN JS. `useMediaQuery` renders one tree on the
 * server and another on the client — the hydration bug this app's shell already
 * commits to avoiding (see Workspace's note on the rail). Every row is rendered
 * either way; `max-lg:` simply hides the ones past the cap until asked. That
 * also means desktop behaviour is provably unchanged: the rule does not apply
 * there at all.
 *
 * Children must be `<li>` elements — the cap is `nth-child`, not a slice, so
 * nothing is unmounted and expanding costs no fetch.
 */
export function CappedList({
  children,
  count,
  label,
  className,
  testId,
}: {
  children: React.ReactNode;
  /** Total rows, for the "Show all N" copy. */
  count: number;
  /** Plural noun for the button — "skills", "runs". */
  label: string;
  className?: string;
  testId?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const hidden = count - CAP;

  return (
    <>
      <ul
        id={id}
        data-testid={testId}
        className={cn(
          "flex flex-col",
          // `nth-child(n+6)` — everything from the sixth row on.
          !expanded && "max-lg:[&>li:nth-child(n+6)]:hidden",
          className,
        )}
      >
        {children}
      </ul>
      {hidden > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls={id}
          data-testid="capped-toggle"
          className="t-mono mt-1 w-full py-2 text-left text-text-dim underline underline-offset-2 transition-colors hover:text-text lg:hidden"
        >
          {expanded ? "Show less" : `Show all ${count} ${label}`}
        </button>
      ) : null}
    </>
  );
}
