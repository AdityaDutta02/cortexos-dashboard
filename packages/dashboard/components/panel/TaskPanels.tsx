"use client";

import { useState } from "react";
import type { PreflightEstimate, Run, TaskDef } from "cortexos-types";
import { ds } from "@/lib/data";
import { canDeleteTask } from "@/lib/task-origin";
import { Button, PreflightDialog, RelativeTime, useToast } from "@/components/ui";
import { PromptBlock } from "./PromptBlock";
import { isViewable, OutputView } from "./OutputView";

/*
 * The `+` flow lives in `NewTaskPanel.tsx`. It is two branches — a dashboard
 * button, and a scheduled prompt to paste into Claude — and keeping it here
 * mixed "what CORTEX made" with "what CORTEX could only ask for".
 */

/** One task the user created: what it runs, and the two things you can do to it. */
export function TaskPanel({
  task,
  runs,
  onDeleted,
  onStarted,
  onOpenRun,
}: {
  task: TaskDef;
  /** Recent runs, newest first — used to show what this task last produced. */
  runs: Run[];
  onDeleted: () => void;
  /** Hand the panel over to the run that just started. See `confirm`. */
  onStarted: (runId: string) => void;
  onOpenRun: (runId: string) => void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"idle" | "confirming" | "starting">("idle");
  const [estimate, setEstimate] = useState<PreflightEstimate | null>(null);
  const deletable = canDeleteTask(task);
  /*
   * WHAT IT LAST MADE, not what it last logged. A task is only interesting for
   * its output: opening one and being shown a description plus a button says
   * nothing about whether the last press worked or what it produced.
   */
  const last = runs.find((run) => run.taskId === task.id);
  /*
   * `missing` names inputs CORTEX has no connector for — and every one of them
   * is something his Claude does have. So this is not a degraded task, it is a
   * task whose home is the other surface.
   */
  const chatOnly = Boolean(task.missing && task.missing.length > 0);
  const inputs = task.missing ?? [];
  const inputList =
    inputs.length <= 1
      ? inputs[0] ?? "connectors"
      : `${inputs.slice(0, -1).join(", ")} and ${inputs.at(-1)}`;
  const output = last?.wrote.find(isViewable);

  /*
   * Pressing a task is a foreground batch, so it takes the same route the
   * backlog button does: estimate → explicit confirm → run. Spec §2.4 makes
   * that non-negotiable, and a task created from the `+` is not an exception
   * to it just because the user wrote the task themselves.
   */
  const openPreflight = async () => {
    setPhase("confirming");
    setEstimate(null);
    try {
      setEstimate(await ds.preflight(task.id));
    } catch (cause) {
      toast({
        tone: "danger",
        message: cause instanceof Error ? cause.message : "Estimate unavailable",
      });
      setPhase("idle");
    }
  };

  /*
   * Confirming does not end here — it hands over to the run.
   *
   * This used to close the dialog and toast "started", which was every visible
   * consequence of pressing Run: the same screen, the same panel, a run the
   * user could not see anywhere. Toasts are for things with no home. A run has
   * one, so we go to it, and it reports its own progress and its own result.
   */
  const confirm = async () => {
    setPhase("starting");
    try {
      const { runId } = await ds.runTask(task.id);
      setPhase("idle");
      onStarted(runId);
    } catch (cause) {
      toast({ tone: "danger", message: cause instanceof Error ? cause.message : "Could not start" });
      setPhase("confirming");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <p className="t-body-lg text-text">{task.description}</p>

      {task.skill && !chatOnly ? (
        <p className="t-body text-text-muted">
          Runs <span className="t-mono text-text">{task.skill}</span> when you press it.
        </p>
      ) : null}

      {/*
        No `nextRun`, ever, for a task CORTEX created — it has no scheduler and
        the agent deliberately refuses to invent one. Budget is free text the
        user wrote; it is shown as what it is, or not at all.
      */}

      {/*
        A JOB THAT BELONGS IN CHAT IS NOT A BROKEN JOB.
        
        This used to be an amber banner: "needs gmail, which this CORTEX cannot
        reach". Every word true, and to anyone who did not build the thing it
        reads as a product that does not work — a warning is read as proof of a
        fault, not as information. The connectors it wants are in his Claude,
        where typing the trigger runs the job by design. So the panel shows the
        way to do it, and the line to paste.
      */}
      {chatOnly ? (
        <section className="flex flex-col gap-3 border border-blue/40 bg-blue-tint px-3.5 py-3">
          <p className="t-body text-text">
            This one runs in Claude, where your {inputList} live. Paste this in and it runs the
            same job, with everything it needs.
          </p>
          <PromptBlock
            prompt={task.chatPrompt ?? task.label}
            heading="Paste into Claude"
            testId="job-chat-prompt"
            copiedMessage="Copied — paste it into Claude"
          />
        </section>
      ) : null}

      {/*
        NO "RUN HERE ANYWAY".

        That button ran the job with the connectors CORTEX happens to have and
        produced a document with holes in it — a morning brief with no morning.
        Offering it made the product author its own worst output and then show
        it to the user as the result of a press.

        `needs::` is a gate, not a warning label. A job runs here or it runs in
        Claude; there is no third, degraded mode, and no button for one.
      */}
      <div className="flex flex-wrap gap-2">
        {chatOnly ? null : (
          <Button variant="primary" onClick={openPreflight}>
            Run now
          </Button>
        )}
        {deletable ? (
          <Button
            variant="ghost"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await ds.deleteTask(task.id);
                toast({ tone: "ok", message: `${task.label} deleted` });
                onDeleted();
              } catch (cause) {
                toast({
                  tone: "danger",
                  message: cause instanceof Error ? cause.message : "Could not delete that task.",
                });
              } finally {
                setBusy(false);
              }
            }}
          >
            Delete
          </Button>
        ) : null}
      </div>

      {!deletable ? (
        <p className="t-caption text-text-dim">
          This one ships with CORTEX, so it cannot be deleted from here.
        </p>
      ) : null}

      {last ? (
        <section className="border-t border-border pt-4">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <p className="eyebrow">Last run</p>
            <button
              type="button"
              onClick={() => onOpenRun(last.id)}
              className="t-mono text-text-dim underline underline-offset-2 hover:text-text"
            >
              {last.status} · <RelativeTime iso={last.startedAt} short />
            </button>
          </div>
          {output ? (
            <OutputView path={output} />
          ) : (
            <p className="t-body-sm text-text-muted">
              {last.error ?? "That run produced no file. Open it for the detail."}
            </p>
          )}
        </section>
      ) : null}

      <PreflightDialog
        open={phase !== "idle"}
        estimate={estimate}
        starting={phase === "starting"}
        onCancel={() => setPhase("idle")}
        onConfirm={confirm}
      />
    </div>
  );
}
