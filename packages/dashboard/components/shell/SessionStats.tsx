"use client";

import type { Headroom } from "cortexos-types";
import { formatCount, formatPct } from "@/lib/format";
import { Dot, Popover } from "@/components/ui";

/**
 * Claude session stats: a bar and a percentage. That is the whole chip.
 *
 * The full token ledger sits behind the click. The old build gave this a
 * headline, a sentence and a caption; the bar says all three.
 */
export function SessionStats({ headroom }: { headroom: Headroom | null }) {
  if (!headroom) {
    return <div className="h-8 w-32 border border-border bg-strip" aria-hidden />;
  }

  /*
   * `usedPct` is null until the owner states a plan, because Anthropic
   * publishes limits in messages and windows rather than tokens. The chip then
   * shows what CORTEX actually spent this week — a measured number — instead of
   * a share of an invented allowance, which is what made a fresh instance
   * display a confident `0%`.
   */
  const pct = headroom.usedPct === null ? null : Math.min(1, Math.max(0, headroom.usedPct));
  const tone = pct === null ? "bg-blue" : pct >= 0.85 ? "bg-danger" : pct >= 0.6 ? "bg-warn" : "bg-blue";
  const { input, output, cacheRead } = headroom.windowTokens;
  const spent = input + output;
  const headline = pct === null ? formatCount(spent) : formatPct(pct);
  const label = pct === null ? `Claude tokens this week: ${spent}` : `Claude used this week: ${formatPct(pct)}`;

  return (
    <Popover
      width={260}
      testId="session-popover"
      trigger={({ open, toggle, id }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={id}
          data-testid="session-stats"
          aria-label={label}
          className="flex h-8 items-center gap-2.5 border border-border px-2.5 transition-colors hover:border-border-strong"
        >
          {/* No bar without a denominator — a bar is a claim about a fraction. */}
          {pct === null ? null : (
            <span className="relative h-2 w-16 bg-neutral-tint">
              <span
                className={`absolute inset-y-0 left-0 ${tone}`}
                style={{ width: `${pct * 100}%` }}
              />
            </span>
          )}
          <span className="t-mono text-text">{headline}</span>
          {pct === null ? <span className="t-mono text-text-dim">tok</span> : null}
        </button>
      )}
    >
      <div className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between">
          <span className="eyebrow">Claude · week</span>
          <span className="font-heading text-[20px] font-medium leading-none text-text">
            {headline}
          </span>
        </div>
        {pct === null ? null : (
          <div className="relative h-2 border border-border bg-paper">
            <div className={`h-full ${tone}`} style={{ width: `${pct * 100}%` }} />
          </div>
        )}
        <dl className="grid grid-cols-3 gap-2 border-t border-border pt-2">
          <Cell k="in" v={formatCount(input)} />
          <Cell k="out" v={formatCount(output)} />
          <Cell k="cache" v={cacheRead ? formatCount(cacheRead) : "—"} />
        </dl>
        {/*
          Was `{headroom.plan ?? "pro"} · resets Fri`. Both halves were untrue
          on a fresh instance: it named a plan nobody had chosen, and Friday is
          not when anything resets — the ledger counts a *rolling* seven days,
          so there is no reset day to name.
        */}
        <div className="t-mono flex items-center gap-1.5 text-text-dim">
          <Dot tone="neutral" size={5} />
          {headroom.plan ? `${headroom.plan} · rolling 7 days` : "rolling 7 days · no plan set"}
        </div>
      </div>
    </Popover>
  );
}

function Cell({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="eyebrow">{k}</dt>
      <dd className="t-body-sm text-text">{v}</dd>
    </div>
  );
}
