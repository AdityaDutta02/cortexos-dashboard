"use client";

import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";
import type { CortexError } from "cortexos-types";
import { cn, formatAbsolute, formatRelative, formatRelativeShort } from "@/lib/format";
import { Button } from "./Button";

/** A subscription that never fires — see RelativeTime. */
const NO_SUBSCRIBE = () => () => {};

/**
 * Skeleton — a shimmering placeholder block. Sized by the caller so the
 * loading layout matches the loaded layout and nothing reflows.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("skeleton-shimmer h-4 w-full border border-border/40", className)}
    />
  );
}

/** Several stacked skeleton lines — the default loading body for a Panel. */
export function SkeletonLines({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2.5" data-testid="skeleton-lines">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={i % 3 === 2 ? "w-2/3" : undefined} />
      ))}
    </div>
  );
}

/**
 * EmptyState — what a section says when it has nothing. Always phrased as a
 * fact about the user's world, never as an apology from the software.
 *
 * **No box, no dashed border, no grid.** It used to draw all three, and a
 * module at zero items read as broken layout rather than as an intentional
 * empty state — a dashed frame with grid lines inside is the universal
 * "content failed to load" shape. Nothing is a quiet line of text, left
 * aligned with the rows that would have been there.
 */
export function EmptyState({
  title,
  detail,
  action,
  icon,
}: {
  title: string;
  detail?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div data-testid="empty-state" className="flex flex-col items-start gap-1.5 px-1 py-5">
      {icon}
      <p className="t-body text-text-muted">{title}</p>
      {detail ? <p className="measure t-caption text-text-dim">{detail}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/**
 * ErrorState — a failed load. Shows the CortexError's own message, because
 * the contract's messages are written to be read by the user.
 */
export function ErrorState({
  error,
  onRetry,
}: {
  error: CortexError;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      data-testid="error-state"
      className="flex flex-col items-start gap-2 border border-danger/40 bg-danger-tint px-4 py-4"
    >
      <span className="eyebrow text-danger">{error.code.replace(/_/g, " ")}</span>
      <p className="font-body text-[13.5px] leading-[21px] text-text">{error.message}</p>
      {onRetry ? (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

/**
 * RelativeTime — "3 hours ago" with the absolute timestamp in the tooltip.
 * Renders the absolute form on the server and swaps after mount, so SSR and
 * the client never disagree about what "now" is.
 */
export function RelativeTime({
  iso,
  className,
  short = false,
}: {
  iso: string;
  className?: string;
  /** "7h" instead of "7 hours ago" — for rails, where space is the constraint. */
  short?: boolean;
}) {
  // useSyncExternalStore with a never-firing subscription is the hydration-safe
  // way to ask "am I on the client yet" without a mount-time setState.
  const mounted = useSyncExternalStore(
    NO_SUBSCRIBE,
    () => true,
    () => false,
  );
  const absolute = formatAbsolute(iso);
  return (
    <time
      dateTime={iso}
      title={absolute}
      className={cn("shrink-0 font-mono text-[11.5px] text-text-dim", className)}
    >
      {mounted ? (short ? formatRelativeShort(iso) : formatRelative(iso)) : absolute}
    </time>
  );
}
