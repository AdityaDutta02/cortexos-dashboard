import type { ReactNode } from "react";
import { cn } from "@/lib/format";

/**
 * Uppercase mono label. The single most recognisable material carried over
 * from the reference build — 11px, 1.54px tracking, DM Mono.
 */
export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={cn("eyebrow", className)}>{children}</p>;
}

/**
 * Card — a hairline-bordered block on paper. Use for a list item or a small
 * standalone unit. For a titled dashboard section use Panel.
 */
export function Card({
  children,
  className,
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  /** Adds hover affordance. Only set this when the whole card is clickable. */
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        "border border-border bg-bg",
        interactive && "transition-colors duration-200 hover:border-border-strong hover:bg-blue-tint",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Panel — the dashboard's section container: a mono eyebrow header bar over a
 * body, framed by a hairline border. Home is built entirely out of these.
 */
export function Panel({
  label,
  count,
  action,
  children,
  className,
  bodyClassName,
  dense = false,
}: {
  label: string;
  /** Rendered next to the label as `[4]`, the reference's counter idiom. */
  count?: number;
  /** Right-aligned control in the header — usually a ghost Button or a link. */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  dense?: boolean;
}) {
  return (
    <section className={cn("border border-border bg-bg", className)}>
      <header className="flex h-[40.5px] items-center justify-between gap-3 border-b border-border bg-strip px-4">
        <span className="eyebrow text-text">
          〉{label}
          {count !== undefined ? ` [${count}]` : ""}
        </span>
        {action}
      </header>
      <div className={cn(dense ? "p-0" : "p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

/**
 * Stat — a big number with a mono label under it. Used in the health strip and
 * on the styleguide. Never used for money; there are no money figures here.
 */
export function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "ok" | "warn" | "danger";
}) {
  const toneClass =
    tone === "ok"
      ? "text-ok"
      : tone === "warn"
        ? "text-warn"
        : tone === "danger"
          ? "text-danger"
          : "text-text";
  return (
    <div className="flex flex-col gap-1">
      <span className={cn("font-heading text-[26px] font-medium leading-none", toneClass)}>
        {value}
      </span>
      <span className="eyebrow">{label}</span>
      {hint ? (
        <span className="font-body text-[12.5px] leading-[18px] text-text-dim">{hint}</span>
      ) : null}
    </div>
  );
}

/**
 * Module — a rail panel. A mono label, an optional glanceable value, and an
 * optional action (the `+` on Connectors and Skills).
 *
 * The header label is `eyebrow-lg` (12px) rather than the 11px marketing
 * eyebrow: a rail label is a heading for a region, and it has to read as one.
 */
export function Module({
  label,
  value,
  action,
  children,
  className,
  bodyClassName,
}: {
  label: string;
  /** Glanceable right-hand value — a count, a percentage, a dot. */
  value?: ReactNode;
  /** A control in the header, e.g. an add button. */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      data-testid={`module-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`}
      className={cn("flex min-h-0 flex-col border border-border bg-bg", className)}
    >
      <header className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-border bg-strip px-3">
        <span className="eyebrow-lg text-text-muted">{label}</span>
        <span className="flex items-center gap-2">
          {value}
          {action}
        </span>
      </header>
      {/*
        `.scroll-region` rather than a bare `overflow-y-auto`: it carries the
        `position: relative` that keeps a module's overflow from escaping into
        the initial containing block and scrolling the whole app shell, plus
        `overscroll-behavior: contain` so a flick that runs out of module does
        not travel to whatever is behind it.
      */}
      <div className={cn("scroll-region min-h-0 flex-1 p-3", bodyClassName)}>{children}</div>
    </section>
  );
}

/** The `+` in a Module header. Square, hairline, one glyph. */
export function ModuleAdd({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-6 w-6 items-center justify-center border border-border text-[15px] leading-none text-text-muted transition-colors hover:border-blue hover:text-blue"
    >
      <span aria-hidden>+</span>
    </button>
  );
}
