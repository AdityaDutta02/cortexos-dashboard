/**
 * Display formatters. Everything user-facing that turns a raw value into a
 * string lives here so copy stays consistent across screens.
 *
 * Hard rule (BOUNDARIES §10): no money figures, ever. There is deliberately
 * no currency formatter in this file and one must never be added.
 */

/** Joins class names, dropping falsy entries. The app's only `cn`. */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600_000],
  ["month", 30 * 24 * 3600_000],
  ["week", 7 * 24 * 3600_000],
  ["day", 24 * 3600_000],
  ["hour", 3600_000],
  ["minute", 60_000],
  ["second", 1000],
];

/** "3 hours ago" / "in 12 days". Deterministic given `now`, so it is testable. */
export function formatRelative(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "unknown";
  const diff = then - now;
  const abs = Math.abs(diff);
  if (abs < 45_000) return "just now";
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, ms] of RELATIVE_UNITS) {
    if (abs >= ms) return rtf.format(Math.round(diff / ms), unit);
  }
  return "just now";
}

/** "7h", "2d", "3w" — for dense rails where the word "ago" is noise. */
export function formatRelativeShort(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const abs = Math.abs(then - now);
  if (abs < 60_000) return "now";
  if (abs < 3600_000) return `${Math.round(abs / 60_000)}m`;
  if (abs < 86_400_000) return `${Math.round(abs / 3600_000)}h`;
  if (abs < 7 * 86_400_000) return `${Math.round(abs / 86_400_000)}d`;
  if (abs < 30 * 86_400_000) return `${Math.round(abs / (7 * 86_400_000))}w`;
  return `${Math.round(abs / (30 * 86_400_000))}mo`;
}

/** "10 Aug, 15:53" — used in tooltips behind every relative time. */
export function formatAbsolute(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** 0..1 → "8%". The headroom bar's only number. */
export function formatPct(fraction: number, digits = 0): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

/** 1_204_000 → "1.2M". Token counts and file counts. */
export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

/** 1536 → "1.5 KB". File sizes on Sources and Outputs. */
export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** `30-resources/pricing-policy.md` → `pricing-policy.md`. */
export function basename(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1] ?? path;
}

/** `30-resources/pricing-policy.md` → `Pricing Policy`. */
export function titleFromPath(path: string): string {
  return basename(path)
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
