"use client";

import { useEffect, useRef, useState } from "react";
import type { Run } from "cortexos-types";
import { ds } from "@/lib/data";
import { basename, formatCount } from "@/lib/format";
import { Markdown } from "@/components/detail/Markdown";
import { isViewable, OutputView } from "./OutputView";
import { Button, DotBullet, RelativeTime, RunStatusBadge, Spinner } from "@/components/ui";

const LEVEL_TONE = {
  debug: "neutral",
  info: "neutral",
  warn: "warn",
  error: "danger",
} as const;

/** How often a live run is re-read. A turn takes minutes; this is cheap. */
const POLL_MS = 1_500;

/**
 * Worth handing to the markdown parser?
 *
 * A run log holds two very different things: one-line machine statuses
 * ("pushed attempt:2") and whole assistant replies, which are markdown. The
 * cheap structural test is enough — a newline or a markdown marker — and
 * getting it wrong in either direction is harmless: prose stays readable, and a
 * status line rendered as markdown is the same string.
 */
function isProse(message: string): boolean {
  return message.length > 120 || /\n|^#{1,6} |^[-*] |\*\*|`/m.test(message);
}

function isLive(run: Run | null): boolean {
  return run?.status === "queued" || run?.status === "running";
}

/**
 * A run in full: status, token cost, everything it wrote, every trickle unit,
 * and the complete log. This is where the rail's one-line row expands to.
 *
 * IT FOLLOWS THE RUN. `seed` is whatever the workspace already had, which for a
 * run started ten milliseconds ago is nothing at all — the run is not in
 * `recentRuns` yet and would have rendered as "no longer in view". So this
 * fetches by id and keeps re-reading while the run is alive.
 *
 * Polling rather than the `/api/runs/stream` SSE feed: the endpoint exists, but
 * a poll degrades to "slightly late" behind a proxy that buffers, where a
 * broken stream degrades to a panel that sits at 0% forever. The wrong failure
 * mode for the one screen that exists to prove something is happening.
 */
export function RunPanel({
  runId,
  seed,
  onOpenNote,
  onFinished,
}: {
  runId: string;
  seed?: Run | undefined;
  onOpenNote: (path: string) => void;
  /** The run reached a terminal state — the rails behind this are now stale. */
  onFinished?: (() => void) | undefined;
}) {
  const [run, setRun] = useState<Run | null>(seed ?? null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  // Fires once per run, and never for a run that was already finished when the
  // panel opened — reloading the whole workspace on every historical run a user
  // clicks would be a refetch storm with nothing new in it.
  const announced = useRef(!isLive(seed ?? null));

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      try {
        const next = await ds.getRun(runId);
        if (stopped) return;
        setRun(next);
        setError(null);
        if (isLive(next)) {
          timer = setTimeout(tick, POLL_MS);
        } else if (!announced.current) {
          announced.current = true;
          onFinished?.();
        }
      } catch (cause) {
        if (stopped) return;
        // A failed read is not a failed run. Say so, keep the last known state
        // on screen, and try again — the run itself is unaffected.
        setError(cause instanceof Error ? cause.message : "Could not read this run.");
        timer = setTimeout(tick, POLL_MS * 2);
      }
    };

    void tick();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [runId, onFinished]);

  if (!run) {
    return (
      <p className="t-body flex items-center gap-2 text-text-muted">
        {error ?? (
          <>
            <Spinner /> Reading this run…
          </>
        )}
      </p>
    );
  }

  const live = isLive(run);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <RunStatusBadge status={run.status} />
        <RelativeTime iso={run.startedAt} className="t-mono" />
        {run.tokens ? (
          <span className="t-mono text-text-dim">
            {formatCount(run.tokens.input)} in · {formatCount(run.tokens.output)} out
          </span>
        ) : null}
      </div>

      {live ? (
        <div className="flex items-center justify-between gap-3 border-l-2 border-blue bg-blue-tint px-3 py-2.5">
          <span className="t-body flex items-center gap-2 text-text">
            <Spinner />
            {/*
              The honest version of a progress bar. The agent reports a fraction
              only for batched work; a single turn has no meaningful percentage,
              and inventing one would be a number that means nothing moving at a
              speed that means nothing.
            */}
            Working
            {(run.progress ?? 0) > 0 && (run.progress ?? 0) < 1
              ? ` — ${Math.round((run.progress ?? 0) * 100)}%`
              : ". This usually takes a minute or two."}
          </span>
          <Button
            size="sm"
            variant="ghost"
            loading={cancelling}
            onClick={async () => {
              setCancelling(true);
              try {
                await ds.cancelRun(run.id);
              } finally {
                setCancelling(false);
              }
            }}
          >
            Stop
          </Button>
        </div>
      ) : null}

      {error ? <p className="t-body-sm text-warn">{error}</p> : null}

      {run.error ? (
        <p className="t-body border-l-2 border-danger bg-danger-tint px-3 py-2.5 text-text">
          {run.error}
        </p>
      ) : null}

      {/*
        THE OUTPUT, NOT A LINK TO IT. This was a list of filenames: the run
        produced a 5,000-word brief and the panel showed `2026-08-13.md` above a
        wall of log. The deliverable is what the button was pressed for, so it
        is what the panel leads with.
      */}
      {run.wrote.length > 0 ? (
        <section>
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <p className="eyebrow">Output</p>
            <button
              type="button"
              onClick={() => onOpenNote(run.wrote[0] as string)}
              className="t-mono text-text-dim underline underline-offset-2 hover:text-text"
            >
              {basename(run.wrote[0] as string)}
            </button>
          </div>
          {run.wrote.filter(isViewable).map((path) => (
            <OutputView key={path} path={path} />
          ))}
          {run.wrote.filter((path) => !isViewable(path)).map((path) => (
            <button
              key={path}
              type="button"
              onClick={() => onOpenNote(path)}
              className="t-body block w-full truncate text-left text-blue underline underline-offset-2"
            >
              {basename(path)}
            </button>
          ))}
        </section>
      ) : null}

      {run.trickleUnits.length > 0 ? (
        <Block label={`Trickle · ${run.trickleUnits.length}`}>
          <ul className="flex flex-col gap-2.5">
            {run.trickleUnits.map((u) => (
              <li key={u.id} className="flex items-start gap-2.5">
                <DotBullet
                  tone={u.status === "done" ? "ok" : u.status === "failed" ? "danger" : "neutral"}
                />
                <span className="t-body-sm text-text-muted">{u.description}</span>
              </li>
            ))}
          </ul>
        </Block>
      ) : null}

      {/*
        Collapsed. The log is an account of the work; the output above IS the
        work. It stays one click away because when an output is wrong the log is
        the only place that says why — and it opens by itself on a failure,
        which is exactly when nobody should have to go looking for it.
      */}
      <details open={run.status === "failed" || run.wrote.length === 0}>
        <summary className="eyebrow cursor-pointer list-none text-text-dim hover:text-text">
          Log · {run.logs.length}
        </summary>
        <div className="mt-2">
        {run.logs.length === 0 ? (
          <p className="t-body-sm text-text-dim">
            {live ? "Nothing logged yet." : "This run logged nothing."}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {run.logs.map((line, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <DotBullet tone={LEVEL_TONE[line.level]} size={6} />
                {/*
                  Claude's replies are markdown — headings, lists, bold, fenced
                  code — and rendering them as preformatted text showed the raw
                  characters. A one-line status stays a plain span: running the
                  full parser over "pushed attempt:2" costs more than it says.
                */}
                {isProse(line.message) ? (
                  <div className="min-w-0 flex-1 text-text-muted [&_*]:text-inherit">
                    <Markdown source={line.message} />
                  </div>
                ) : (
                  <span className="t-body-sm whitespace-pre-wrap text-text-muted">
                    {line.message}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        </div>
      </details>
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="eyebrow mb-2">{label}</p>
      {children}
    </section>
  );
}
