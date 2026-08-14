"use client";

import type { Run, RunStatus, TaskDef, TriggerKind } from "cortexos-types";
import { pressableTasks } from "@/lib/task-origin";
import { CappedList, Dot, EmptyState, Module, ModuleAdd, RelativeTime } from "@/components/ui";

const STATUS_TONE: Record<RunStatus, "ok" | "warn" | "danger" | "blue" | "neutral"> = {
  queued: "neutral",
  running: "blue",
  succeeded: "ok",
  failed: "danger",
  cancelled: "neutral",
  paused: "warn",
};

/** Trigger as a single glyph — the four (plus trickle) are visually distinct. */
const TRIGGER_GLYPH: Record<TriggerKind, string> = {
  dashboard_button: "▶",
  chat_command: "❯",
  claude_code_hook: "⌘",
  routine: "◷",
  trickle: "∴",
};

const TRIGGER_TITLE: Record<TriggerKind, string> = {
  dashboard_button: "you pressed it",
  chat_command: "you asked in Claude",
  claude_code_hook: "a Claude Code session",
  routine: "a scheduled Routine",
  trickle: "rode your live session",
};

/**
 * Tasks. One row per run: trigger glyph, status dot, label, trickle count.
 * Pressing a row expands what it wrote and which trickle units drained —
 * spec §2.4 keeps trickle visible, but it does not have to be visible *at
 * rest*, only one click away and never hidden behind a setting.
 *
 * The `+` is the same gesture Connectors and Skills carry, in the same place,
 * and it creates a **dashboard button** — the one trigger CORTEX owns. Tasks
 * the user made are listed above the run history, because a task that has
 * never run has no run to appear as, and a `+` whose result is invisible is
 * not one click and one visible change.
 */
export function TasksModule({
  runs,
  tasks,
  onOpen,
  onOpenTask,
  onNew,
}: {
  runs: Run[];
  tasks: TaskDef[];
  onOpen: (id: string) => void;
  onOpenTask: (id: string) => void;
  onNew: () => void;
}) {
  const mine = pressableTasks(tasks);

  return (
    <Module
      /*
       * "Tasks", his word. It was renamed to "Scheduled" on the theory that a
       * task and a run needed separating — but only some of these are
       * scheduled, so the heading was also simply untrue about the rest.
       */
      label="Tasks"
      /*
       * Tasks first, runs second. This read `runs.length` alone, so an instance
       * with 134 tasks and no history showed "0" under a heading that says
       * Tasks — true about runs, and unreadable as anything but "there are no
       * tasks". The run count stays, because a running task is the thing worth
       * seeing at a glance; it is just no longer the only number here.
       */
      value={
        <>
          {runs.some((r) => r.status === "running") ? <Dot tone="blue" pulse /> : null}
          <span className="t-mono text-text-dim">
            {mine.length}
            {runs.length > 0 ? ` · ${runs.length} run${runs.length === 1 ? "" : "s"}` : null}
          </span>
        </>
      }
      action={<ModuleAdd label="Create a new task" onClick={onNew} />}
    >
      {mine.length > 0 ? (
        <CappedList count={mine.length} label="tasks" className="mb-2 border-b border-border/50 pb-2" testId="user-tasks">
          {mine.map((task) => (
            <li key={task.id}>
              <button
                type="button"
                onClick={() => onOpenTask(task.id)}
                title={task.description}
                className="flex w-full items-center gap-2.5 px-1 py-2.5 text-left transition-colors hover:bg-blue-tint"
              >
                <span
                  aria-hidden
                  title={TRIGGER_TITLE.dashboard_button}
                  className="t-mono w-4 shrink-0 text-center text-text-dim"
                >
                  {TRIGGER_GLYPH.dashboard_button}
                </span>
                <span className="t-body min-w-0 flex-1 truncate text-text">{task.label}</span>
                {/*
                  Where the job runs, not what it lacks. `❯` is already this
                  app's glyph for "you asked in Claude", so the row says the
                  same thing the run history says — in the same language, and
                  without the amber that made a working job look broken.
                */}
                {task.missing && task.missing.length > 0 ? (
                  <span
                    title={`Runs in Claude, where your ${task.missing.join(", ")} live`}
                    className="t-mono shrink-0 text-text-dim"
                  >
                    {TRIGGER_GLYPH.chat_command} in Claude
                  </span>
                ) : task.skill ? (
                  <span className="t-mono shrink-0 text-text-dim">{task.skill}</span>
                ) : null}
              </button>
            </li>
          ))}
        </CappedList>
      ) : null}

      {runs.length === 0 ? (
        <EmptyState
          title="Nothing has run yet"
          detail={
            mine.length > 0
              ? "Press one of the buttons above, or build your own with +."
              : "Runs appear here whether you started them or Claude did. Build a button with +."
          }
        />
      ) : (
      <CappedList count={runs.length} label="runs" testId="task-runs">
        {runs.map((run) => (
          <li key={run.id} className="border-b border-border/50 last:border-b-0">
            <button
              type="button"
              onClick={() => onOpen(run.id)}
              className="flex w-full items-center gap-2.5 px-1 py-2.5 text-left transition-colors hover:bg-blue-tint"
            >
              <span
                aria-hidden
                title={TRIGGER_TITLE[run.trigger]}
                className="t-mono w-4 shrink-0 text-center text-text-dim"
              >
                {TRIGGER_GLYPH[run.trigger]}
              </span>
              <Dot tone={STATUS_TONE[run.status]} size={7} pulse={run.status === "running"} />
              <span className="t-body min-w-0 flex-1 truncate text-text">{run.label}</span>
              {run.trickleUnits.length > 0 ? (
                <span
                  title={`${run.trickleUnits.length} backlog units rode this session`}
                  className="t-mono shrink-0 text-blue"
                >
                  ∴{run.trickleUnits.length}
                </span>
              ) : null}
              <RelativeTime iso={run.startedAt} short className="t-mono" />
            </button>
          </li>
        ))}
      </CappedList>
      )}
    </Module>
  );
}
