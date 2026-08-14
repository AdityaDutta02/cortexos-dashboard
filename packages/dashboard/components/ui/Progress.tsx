import { cn, formatPct } from "@/lib/format";

/**
 * ProgressBar — determinate when `value` (0..1) is given, indeterminate when
 * it is omitted. A Run whose `progress` is undefined must use the
 * indeterminate form rather than faking a number.
 */
export function ProgressBar({
  value,
  label,
  tone = "blue",
  className,
}: {
  value?: number;
  label?: string;
  tone?: "blue" | "ok" | "warn" | "danger";
  className?: string;
}) {
  const fill =
    tone === "ok" ? "bg-ok" : tone === "warn" ? "bg-warn" : tone === "danger" ? "bg-danger" : "bg-blue";
  const determinate = typeof value === "number";
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <div className="flex items-baseline justify-between">
          <span className="eyebrow">{label}</span>
          {determinate ? (
            <span className="font-mono text-[11px] text-text-muted">{formatPct(value)}</span>
          ) : null}
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={determinate ? Math.round(value * 100) : undefined}
        aria-label={label ?? "Progress"}
        className="relative h-1.5 w-full overflow-hidden bg-neutral-tint"
      >
        {determinate ? (
          <div
            className={cn("h-full transition-[width] duration-500 ease-[var(--ease-out-expo)]", fill)}
            style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }}
          />
        ) : (
          <div className={cn("progress-indeterminate h-full w-1/4", fill)} />
        )}
      </div>
    </div>
  );
}

/**
 * Meter — the headroom bar. A horizontal capacity bar with a label, a value
 * and an optional threshold marker.
 *
 * Deliberately calm: it stays blue until the threshold, because spec §2.4
 * says nothing spends without a click, so there is nothing to alarm about.
 */
export function Meter({
  value,
  label,
  caption,
  threshold,
  thresholdLabel,
  className,
}: {
  /** 0..1. */
  value: number;
  label: string;
  /** The sentence under the bar, e.g. "Resets Friday." */
  caption?: string;
  /** 0..1 — draws a marker line, e.g. the pre-flight estimate. */
  threshold?: number;
  thresholdLabel?: string;
  className?: string;
}) {
  const pct = Math.min(1, Math.max(0, value));
  const tone = pct >= 0.85 ? "bg-danger" : pct >= 0.6 ? "bg-warn" : "bg-blue";
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="eyebrow">{label}</span>
        <span className="font-heading text-[20px] font-medium leading-none text-text">
          {formatPct(pct)}
        </span>
      </div>
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct * 100)}
        aria-label={label}
        className="relative h-2.5 w-full border border-border bg-paper"
      >
        <div
          className={cn("h-full transition-[width] duration-700 ease-[var(--ease-out-expo)]", tone)}
          style={{ width: `${pct * 100}%` }}
        />
        {typeof threshold === "number" ? (
          <div
            className="absolute top-[-4px] bottom-[-4px] w-px bg-text"
            style={{ left: `${Math.min(100, Math.max(0, threshold * 100))}%` }}
            title={thresholdLabel}
            aria-hidden
          />
        ) : null}
      </div>
      {caption ? (
        <p className="font-body text-[13px] leading-[20px] text-text-muted">{caption}</p>
      ) : null}
    </div>
  );
}
