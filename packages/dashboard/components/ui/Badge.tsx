import type { ReactNode } from "react";
import { TIER_LABEL, type ConnectorHealth, type RunStatus, type Tier } from "cortexos-types";
import { cn } from "@/lib/format";

export type BadgeTone = "neutral" | "blue" | "ok" | "warn" | "danger" | "outline";

const TONE: Record<BadgeTone, string> = {
  neutral: "border-transparent bg-neutral-tint text-text-muted",
  blue: "border-transparent bg-blue-tint text-blue",
  ok: "border-transparent bg-ok-tint text-ok",
  warn: "border-transparent bg-warn-tint text-warn",
  danger: "border-transparent bg-danger-tint text-danger",
  outline: "border-border bg-transparent text-text-muted",
};

/**
 * Badge — a small mono status token. Square, uppercase, no pill radius, so it
 * reads as a label on a spec sheet rather than a notification bubble.
 */
export function Badge({
  children,
  tone = "neutral",
  title,
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  title?: string;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex h-5 items-center gap-1 border px-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.08em]",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Chip — a removable/selectable filter token. Larger than Badge and
 * interactive; used for relation-type filters and search facets.
 */
export function Chip({
  children,
  selected = false,
  onClick,
  className,
}: {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 border px-2.5 font-body text-[13px] transition-colors duration-200",
        selected
          ? "border-blue bg-blue-tint text-blue"
          : "border-border bg-bg text-text-muted hover:border-border-strong hover:text-text",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Cold / Warm / Hot. Colour rises with the tier, so a screen reads at a glance. */
export function TierBadge({ tier }: { tier: Tier }) {
  const tone: BadgeTone = tier === 2 ? "blue" : tier === 1 ? "outline" : "neutral";
  return (
    <Badge tone={tone} title={`Tier ${tier} — ${TIER_LABEL[tier]}`}>
      {TIER_LABEL[tier]}
    </Badge>
  );
}

const RUN_TONE: Record<RunStatus, BadgeTone> = {
  queued: "neutral",
  running: "blue",
  succeeded: "ok",
  failed: "danger",
  cancelled: "neutral",
  paused: "warn",
};

/** Run status, coloured consistently everywhere a run appears. */
export function RunStatusBadge({ status }: { status: RunStatus }) {
  return <Badge tone={RUN_TONE[status]}>{status}</Badge>;
}

const HEALTH_TONE: Record<ConnectorHealth, BadgeTone> = {
  ok: "ok",
  degraded: "warn",
  failing: "danger",
  unconfigured: "neutral",
};

/** Connector health. `unconfigured` is deliberately grey, not red — it is not broken. */
export function HealthBadge({ health }: { health: ConnectorHealth }) {
  return <Badge tone={HEALTH_TONE[health]}>{health}</Badge>;
}

/**
 * `proposed::` marker. Spec §6.2 — the node is searchable but excluded from
 * reasoning, and the UI must always say so rather than hiding it.
 */
export function ProposedBadge() {
  return (
    <Badge tone="warn" title="Below the confidence gate — searchable, but excluded from reasoning.">
      proposed
    </Badge>
  );
}

/** Which retrieval arm produced a hit. Shown on every search result. */
export function MatchedByBadge({ matchedBy }: { matchedBy: ("keyword" | "semantic")[] }) {
  return (
    <span className="inline-flex gap-1">
      {matchedBy.map((m) => (
        <Badge key={m} tone="outline">
          {m}
        </Badge>
      ))}
    </span>
  );
}

/**
 * Dot — the smallest possible status carrier. Health, run state and connector
 * state all reduce to this; a word only appears when the dot is ambiguous.
 */
export function Dot({
  tone,
  pulse = false,
  size = 8,
  title,
}: {
  tone: "ok" | "warn" | "danger" | "blue" | "neutral";
  pulse?: boolean;
  size?: number;
  title?: string;
}) {
  const bg =
    tone === "ok"
      ? "bg-ok"
      : tone === "warn"
        ? "bg-warn"
        : tone === "danger"
          ? "bg-danger"
          : tone === "blue"
            ? "bg-blue"
            : "bg-neutral";
  return (
    <span
      title={title}
      aria-hidden
      style={{ width: size, height: size }}
      className={cn("inline-block shrink-0", bg, pulse && "animate-pulse")}
    />
  );
}

/** Line box heights from the type scale, so a bullet can be centred on one. */
const LINE_HEIGHT = {
  body: 24,
  "body-sm": 21,
  caption: 19.5,
  mono: 16,
} as const;

/**
 * DotBullet — a `Dot` centred on the first line of the text beside it.
 *
 * Every dot-and-text row used to hand-roll this with a margin (`mt-1.5`,
 * `mt-2`, `mt-[7px]` — three different guesses in six places), and none of
 * them landed: the wrapping span forms its own line box, so the dot sat on
 * *that* baseline and the margin pushed it further off. Sizing the wrapper to
 * the exact line-height of the neighbouring type and centring inside it makes
 * the alignment exact and independent of the dot's size.
 *
 * Pass the type scale the text uses; the default is `.t-body-sm`.
 */
export function DotBullet({
  tone,
  size = 7,
  pulse,
  title,
  line = "body-sm",
}: {
  tone: "ok" | "warn" | "danger" | "blue" | "neutral";
  size?: number;
  pulse?: boolean;
  title?: string;
  line?: keyof typeof LINE_HEIGHT;
}) {
  return (
    <span
      className="flex shrink-0 items-center"
      style={{ height: LINE_HEIGHT[line], width: size }}
    >
      <Dot tone={tone} size={size} pulse={pulse} title={title} />
    </span>
  );
}
