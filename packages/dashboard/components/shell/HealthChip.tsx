"use client";

import type { SystemHealth } from "cortexos-types";
import { formatBytes, formatPct } from "@/lib/format";
import { Button, Dot, DotBullet, Popover } from "@/components/ui";
import { indexIssues, useIndexStatus } from "@/lib/index-status";

const WORD: Record<SystemHealth["status"], string> = {
  green: "healthy",
  amber: "attention",
  // `red` is genuinely used for environmental problems — a full disk — so it
  // must not read as "CORTEX is broken". Doc §"Where the real behaviour differs".
  red: "needs action",
};

const TONE = { green: "ok", amber: "warn", red: "danger" } as const;

/**
 * A dot and a word. Everything else — the issue list, disk, index age, and the
 * annual re-auth — lives behind the click.
 *
 * The one exception to "no numbers in the chip" is the token-expiry countdown:
 * spec §11 makes re-auth a designed, dated event, so it earns a mono chip once
 * it is inside the 14-day window. It is two characters.
 */
export function HealthChip({
  health,
  onReauth,
  reauthBusy,
  onOpenDetail,
}: {
  health: SystemHealth | null;
  onReauth: () => void;
  reauthBusy?: boolean;
  onOpenDetail: () => void;
}) {
  const index = useIndexStatus();

  if (!health) {
    return <div className="h-8 w-28 border border-border bg-strip" aria-hidden />;
  }

  // Null is "unknown", which is the normal case and not a warning — see
  // `SystemHealth.tokenExpiresInDays`.
  const expiring = health.tokenExpiresInDays !== null && health.tokenExpiresInDays <= 14;
  // The index gets its own indicator: a stale or half-built index is the one
  // failure that produces confident wrong answers rather than an error.
  const idxIssues = indexIssues(health);
  const indexBad = index.degraded || idxIssues.length > 0;

  return (
    <Popover
      align="start"
      width={320}
      testId="health-popover"
      trigger={({ open, toggle, id }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={id}
          data-testid="health-chip"
          aria-label={`System health: ${WORD[health.status]}`}
          className="flex h-8 items-center gap-2 border border-border px-2.5 transition-colors hover:border-border-strong"
        >
          <Dot tone={TONE[health.status]} pulse={health.status === "red"} />
          <span className="t-body-sm text-text">{WORD[health.status]}</span>
          {indexBad ? (
            <span
              className="t-mono border-l border-border pl-2 text-warn"
              title={
                index.degraded
                  ? "Your last search ran against a partial index."
                  : idxIssues.map((i) => i.message).join(" · ")
              }
            >
              index
            </span>
          ) : null}
          {expiring ? (
            <span className="t-mono border-l border-border pl-2 text-warn">
              {health.tokenExpiresInDays}d
            </span>
          ) : null}
        </button>
      )}
    >
      <div className="flex flex-col gap-2.5">
        {index.degraded ? (
          <div className="border-l-2 border-warn bg-warn-tint px-2.5 py-2">
            <p className="eyebrow text-warn">Incomplete index</p>
            <p className="t-body-sm mt-0.5 text-text">
              Your last search only covered part of the vault. Results may be missing things
              CORTEX has.
            </p>
          </div>
        ) : null}
        {expiring ? (
          <div className="flex items-center justify-between gap-2 border border-warn/50 bg-warn-tint px-2.5 py-2">
            <span className="t-body-sm text-text">Claude sign-in · {health.tokenExpiresInDays}d</span>
            <Button size="sm" variant="primary" loading={reauthBusy} onClick={onReauth}>
              Renew
            </Button>
          </div>
        ) : null}

        <ul className="flex flex-col gap-1.5">
          {health.issues.map((issue, i) => (
            <li key={i} className="flex items-start gap-2">
              <DotBullet
                size={6}
                tone={
                  issue.severity === "error"
                    ? "danger"
                    : issue.severity === "warn"
                      ? "warn"
                      : "neutral"
                }
              />
              <span className="t-body-sm text-text-muted">{issue.message}</span>
            </li>
          ))}
        </ul>

        {/*
          The rule runs the full width of the popover, not the width of the
          padded content: it separates two regions of the panel, so it has to
          meet the panel's edges. Inset by the popover's own padding it read as
          a stray underline that lined up with nothing.
        */}
        <div className="-mx-3 mt-0.5 flex items-center justify-between gap-2 border-t border-border px-3 pt-2">
          <span className="t-mono text-text-dim" title={`${formatPct(health.diskPct)} of ${health.diskPath} used`}>
            {formatBytes(health.diskFreeBytes)} free
          </span>
          <button
            type="button"
            onClick={onOpenDetail}
            className="t-body-sm text-blue underline underline-offset-2"
          >
            Open
          </button>
        </div>
      </div>
    </Popover>
  );
}
