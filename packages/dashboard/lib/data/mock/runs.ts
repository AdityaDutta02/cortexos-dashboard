/**
 * Tasks, routines and runs — including the only stateful thing in the mock: a
 * run started from the dashboard button completes over ~24 seconds, so the
 * polling and progress UI can be built against something that actually moves.
 */

import type {
  DataSource,
  NewTaskInput,
  NewTaskResult,
  Page,
  PreflightEstimate,
  Routine,
  Run,
  TaskDef,
} from "cortexos-types";

import { PREFLIGHT, PROMOTION_QUEUE, ROUTINES, RUNS, TASKS } from "../fixtures/runs";
import { err, settle } from "./options";

/** Runs created during this browser session, newest first. */
const liveRuns = new Map<string, Run>();
let runSeq = 0;

/** Simulated progress: a run created here completes over ~24 seconds. */
const RUN_DURATION_MS = 24_000;

export function advance(run: Run): Run {
  if (run.status !== "running") return run;
  const elapsed = Date.now() - new Date(run.startedAt).getTime();
  const progress = Math.min(1, elapsed / RUN_DURATION_MS);
  if (progress >= 1) {
    return {
      ...run,
      progress: 1,
      status: "succeeded",
      finishedAt: new Date().toISOString(),
      wrote: PROMOTION_QUEUE.next.map((n) => n.path),
      logs: [
        ...run.logs,
        {
          ts: new Date().toISOString(),
          level: "info",
          message: "Committed as 1 batch, index rebuilt",
        },
      ],
    };
  }
  return { ...run, progress };
}

/** Live runs first, then the fixtures. Shared with the home summary. */
export function recentRuns(): Run[] {
  return [...liveRuns.values()].map(advance).reverse().concat(RUNS);
}

/**
 * Tasks created from the dashboard's `+` this session, newest first.
 *
 * They carry `origin: "user"` — the discriminator the UI needs to decide
 * whether to offer delete, and the one field `TaskDef` does not yet declare.
 * See `lib/task-origin.ts`; it is read through a runtime guard, so the mock
 * emitting it changes nothing until the live agent does too.
 */
const createdTasks: (TaskDef & { origin: "user" })[] = [];
let taskSeq = 0;

/** `2/day` → `Twice a day`. Only the counts the agent's own table names. */
const TIMES: Record<string, string> = { "1": "Every", "2": "Twice a", "3": "Three times a" };

/** The adverbs, which are a cadence without being a rate. */
const ADVERBS: Record<string, string> = {
  hourly: "Every hour",
  daily: "Every day",
  weekly: "Every week",
  monthly: "Every month",
};

/**
 * The mock's copy of the agent's sentence, from the table in
 * `packages/agent/docs/06-http-api.md` ("The exact `routinePrompt` wording"),
 * re-checked against the live agent on 2026-08-11.
 *
 * The frontend composes none of this — it renders `routinePrompt` verbatim —
 * so the composing has to happen *somewhere* on the mock side or offline mode
 * teaches a contract the real agent does not honour. It used to return the
 * bare sentence whatever the budget said, which is the shape the live agent
 * only returns for a **blank** budget, and the UI's "this carries no when"
 * warning then fired on every mock routine.
 */
function routinePrompt(label: string, budget?: string): string {
  const base = `run my ${label.toLowerCase()} via CORTEX`;
  const when = budget?.trim();
  if (!when) return `Run my ${label.toLowerCase()} via CORTEX`;

  const rate = /^(\d+)\s*\/\s*(day|week|month|year)$/i.exec(when);
  const count = rate?.[1] ?? "";
  const period = rate?.[2]?.toLowerCase() ?? "";
  const clause =
    ADVERBS[when.toLowerCase()] ??
    (rate
      ? `${TIMES[count] ?? `${count} times a`} ${period}`
      : /^every\b/i.test(when)
        ? `Every${when.slice("every".length)}`
        : `Every ${when}`);
  return `${clause}, ${base}`;
}

export const runsMock: Pick<
  DataSource,
  | "listTasks"
  | "createTask"
  | "deleteTask"
  | "listRoutines"
  | "listRuns"
  | "getRun"
  | "runTask"
  | "cancelRun"
  | "preflight"
> = {
  async listTasks(): Promise<TaskDef[]> {
    return settle("runs", () => [...createdTasks, ...TASKS]);
  },

  /**
   * Mirrors the asymmetry the real agent has to honour (spec §2.4).
   *
   * The **task** is created: it is a `dashboard_button` trigger bound to a
   * skill, and pressing it dispatches. The **Routine** is not — Anthropic's
   * scheduler runs on the user's own account, so `asRoutine` returns a sentence
   * to register there and registers nothing here.
   *
   * `nextRun` is deliberately never set. A task that renders as scheduled when
   * nothing scheduled it is worse than no task at all.
   */
  async createTask(input: NewTaskInput): Promise<NewTaskResult> {
    return settle("runs", () => {
      const label = input.label.trim();
      if (!label) throw err("invalid_input", "A task needs a name.");
      if (!input.skill.trim()) throw err("invalid_input", "A task needs a skill to run.");
      taskSeq += 1;
      const task: TaskDef & { origin: "user" } = {
        id: `task_user_${taskSeq}`,
        label,
        description: input.description?.trim() || `Runs ${input.skill}.`,
        triggers: ["dashboard_button"],
        skill: input.skill,
        enabled: true,
        origin: "user",
      };
      createdTasks.unshift(task);
      return {
        task,
        ...(input.asRoutine ? { routinePrompt: routinePrompt(label, input.budget) } : {}),
      };
    });
  },

  async deleteTask(id: string): Promise<void> {
    return settle("runs", () => {
      const at = createdTasks.findIndex((t) => t.id === id);
      if (at === -1) {
        // Built-ins come from the template. Refusing here is the same refusal
        // the UI makes by not offering the button — belt and braces, because a
        // deleted template task cannot be got back from the dashboard.
        throw err("invalid_input", "That task ships with CORTEX and cannot be deleted.");
      }
      createdTasks.splice(at, 1);
    });
  },

  async listRoutines(): Promise<Routine[]> {
    return settle("runs", ROUTINES);
  },

  async listRuns(cursor?: string): Promise<Page<Run>> {
    void cursor;
    return settle("runs", () => ({ items: recentRuns() }));
  },

  async getRun(id: string): Promise<Run> {
    return settle("runs", () => {
      const live = liveRuns.get(id);
      if (live) {
        const next = advance(live);
        liveRuns.set(id, next);
        return next;
      }
      const found = RUNS.find((r) => r.id === id);
      if (!found) throw err("not_found", `No run ${id}`);
      return found;
    });
  },

  async runTask(taskId: string, inputs?: Record<string, unknown>): Promise<{ runId: string }> {
    void inputs;
    return settle("runs", () => {
      runSeq += 1;
      const id = `run_live_${runSeq}`;
      const task = TASKS.find((t) => t.id === taskId);
      liveRuns.set(id, {
        id,
        label: task?.label ?? taskId,
        skill: task?.skill,
        taskId,
        trigger: "dashboard_button",
        status: "running",
        startedAt: new Date().toISOString(),
        progress: 0,
        model: "sonnet",
        wrote: [],
        outputs: [],
        logs: [
          {
            ts: new Date().toISOString(),
            level: "info",
            message: `Pre-flight accepted — ${PREFLIGHT.itemCount} items`,
          },
        ],
        trickleUnits: [],
      });
      return { runId: id };
    });
  },

  async cancelRun(id: string): Promise<void> {
    return settle("runs", () => {
      const run = liveRuns.get(id);
      if (run) {
        liveRuns.set(id, {
          ...advance(run),
          status: "cancelled",
          finishedAt: new Date().toISOString(),
        });
      }
    });
  },

  async preflight(taskId: string, inputs?: Record<string, unknown>): Promise<PreflightEstimate> {
    void taskId;
    void inputs;
    return settle("runs", PREFLIGHT);
  },
};
