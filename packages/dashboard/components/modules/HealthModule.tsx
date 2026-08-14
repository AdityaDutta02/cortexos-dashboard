"use client";

import type { BackgroundStatus, PromotionQueue, SystemHealth } from "cortexos-types";
import { ds } from "@/lib/data";
import { formatCount } from "@/lib/format";
import { usePolling } from "@/lib/use-async";
import { Dot, Module, RelativeTime } from "@/components/ui";

/**
 * WHAT THE SYSTEM IS DOING, WITH NOTHING TO PRESS.
 *
 * This replaced the Ingest module, which was a control surface for machinery
 * nobody asked to operate. It headlined a promotion-queue depth, offered a
 * `Process` button that ran graph extraction over ranked vault notes, and sat
 * one inch below a drop zone — so a person who had just dropped a file read all
 * of it as being about their file. None of it was.
 *
 * Dropping is now a dashboard-wide gesture with its own modal, and the backlog
 * drains on a timer. What is left here is the honest remainder: is anything
 * wrong, and is the worker actually working. Read-only, by design — the owner's
 * rule was that whatever needs running gets run automatically, so a button here
 * would only ever mean "the automation didn't".
 *
 * NO SPEND CAP EXISTS. The owner declined one. That makes this module the whole
 * of the accountability for unattended spend: if a pass is running, or failing
 * every half hour, this is where it shows.
 */
export function HealthModule({
  health,
  backlog,
  onOpenHealth,
}: {
  health: SystemHealth | null;
  backlog: PromotionQueue;
  onOpenHealth: () => void;
}) {
  /*
   * Polled slowly. Nothing here is urgent to the second, the handler reads
   * in-memory state, and a fast poll on a permanently-visible module is a
   * background cost paid forever.
   */
  const { data: background } = usePolling<BackgroundStatus>(
    async () => ds.getBackgroundStatus(),
    15_000,
    true,
  );

  const issues = health?.issues ?? [];
  // `error` and `warn` only. Info-level lines are true and not worth a slot on
  // a module whose whole job is "is anything wrong".
  const problems = issues.filter((issue) => issue.severity !== "info");
  const tone = health?.status === "red" ? "danger" : health?.status === "amber" ? "warn" : "ok";
  const queued = backlog.next.length;

  return (
    <Module
      label="System"
      value={<Dot tone={background?.running ? "blue" : tone} pulse={background?.running} />}
    >
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onOpenHealth}
          className="text-left transition-colors hover:text-blue"
        >
          <p className="t-metric text-text">
            {problems.length === 0 ? "All good" : formatCount(problems.length)}
          </p>
          <p className="t-caption text-text-muted">
            {problems.length === 0
              ? "nothing needs you"
              : `${problems.length === 1 ? "issue" : "issues"} · open for detail`}
          </p>
        </button>

        {/* Every problem in full. Truncating the one sentence that says what to
            do is how a fixable fault becomes a mystery. */}
        {problems.slice(0, 3).map((issue) => (
          <p
            key={issue.message}
            className={`t-body-sm ${issue.severity === "error" ? "text-danger" : "text-warn"}`}
          >
            {issue.message}
            {issue.action ? <span className="text-text-muted"> — {issue.action}</span> : null}
          </p>
        ))}

        <BackgroundLine background={background ?? null} queued={queued} />
      </div>
    </Module>
  );
}

/**
 * The worker, in one or two lines.
 *
 * Says the three things that matter and no more: whether it is on, when it last
 * did anything, and whether that went wrong. A pass that found nothing is not
 * reported as work — it spent nothing and saying "ran, did nothing" every half
 * hour trains people to ignore the line that eventually matters.
 */
function BackgroundLine({
  background,
  queued,
}: {
  background: BackgroundStatus | null;
  queued: number;
}) {
  if (!background) return null;

  if (!background.enabled) {
    return (
      <p className="t-caption border-t border-border/60 pt-2 text-text-muted">
        Background passes are off. {queued > 0 ? `${queued} waiting.` : "Nothing waiting."}
      </p>
    );
  }

  const lastReal = background.passes.find((pass) => pass.items > 0);
  const lastFailure = background.passes.find((pass) => !pass.ok);

  return (
    <div className="flex flex-col gap-0.5 border-t border-border/60 pt-2">
      <p className="t-caption text-text-muted">
        {background.running
          ? "Working now."
          : `Checks every ${background.intervalMinutes} min.`}{" "}
        {queued > 0 ? `${queued} waiting.` : "Nothing waiting."}
      </p>
      {lastReal ? (
        <p className="t-caption text-text-dim">
          Last did {lastReal.items} <RelativeTime iso={lastReal.at} short />
        </p>
      ) : null}
      {/* A failing worker is the one thing on this module that is genuinely
          urgent: it spends and it is unattended. */}
      {lastFailure ? (
        <p className="t-body-sm text-danger">
          A background pass failed: {lastFailure.error ?? "no reason given"}
        </p>
      ) : null}
    </div>
  );
}
