import type { TaskDef } from "cortexos-types";

/**
 * Did the user create this task, or did it ship with CORTEX?
 *
 * `deleteTask` applies only to user-created tasks — built-ins are template and
 * deleting one from the dashboard could not be undone from the dashboard. So
 * the UI has to know which is which, and **`TaskDef` does not currently say.**
 * It carries `id`, `label`, `description`, `triggers`, `skill`, `lastRun`,
 * `nextRun` and `enabled`; nothing distinguishes origin.
 *
 * Pattern-matching the id (`/^process[-_]backlog$/`…) is not an option — that
 * is the "correct for one vault, a guess for the next" trap that `lib/insights`
 * already documents, and here it would put a destructive button on a guess.
 *
 * So this reads three signals, in order, the way `lib/discovery.ts` reads
 * `invocable`:
 *
 * 1. agent says `origin`/`source` → believe it;
 * 2. the id is in the agent's `user:` namespace → believe that;
 * 3. the task was created in this browser session → we know first-hand;
 * 4. otherwise **`null`, and null never gets a delete button.**
 *
 * Step 2 needs justifying, because it is a prefix match and this file has just
 * argued against those. It is not a guess about the user's data: the **agent
 * mints these ids**, and it namespaces them — `process-backlog` for template,
 * `skill:meeting-to-actions` for a skill-derived task, `user:draft-this-weeks-post`
 * for one the `+` created (verified live, 2026-08-11, and `DELETE` on a
 * built-in is refused with `invalid_input`). It is agent-internal naming, not
 * vault content, and it fails safe: if the convention changes, delete stops
 * being offered rather than starting to be offered on a template.
 *
 * It is still a convention standing in for a field. `TaskDef` wants an explicit
 * `origin: "user" | "template"` — see the report — and when it lands, step 1
 * takes over and step 2 can go.
 *
 * Unknown must not collapse into either answer. Defaulting to `"user"` would
 * offer delete on the template; defaulting to `"template"` would make a task
 * the user just made undeletable.
 */
export type TaskOrigin = "user" | "template";

/**
 * The agent's namespace for tasks the dashboard created. Anchored, so a label
 * that merely contains the word cannot match.
 */
const USER_ID_PREFIX = "user:";

/** Ids created through `createTask` in this browser session. */
const createdThisSession = new Set<string>();

export function rememberCreatedTask(id: string): void {
  createdThisSession.add(id);
}

/** For tests: forget everything this session claimed to have created. */
export function resetCreatedTasks(): void {
  createdThisSession.clear();
}

/**
 * Reads a string property the declared type does not have. One cast, isolated
 * here, so no caller needs its own — and nothing in the app uses `any`.
 */
function readString(source: object, key: string): string | null {
  const value = (source as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
}

export function taskOrigin(task: TaskDef): TaskOrigin | null {
  const declared = readString(task, "origin") ?? readString(task, "source");
  if (declared === "user" || declared === "template") return declared;
  if (task.id.startsWith(USER_ID_PREFIX)) return "user";
  if (createdThisSession.has(task.id)) return "user";
  return null;
}

/** Only a task we positively know the user made may be deleted. */
export function canDeleteTask(task: TaskDef): boolean {
  return taskOrigin(task) === "user";
}

/** The tasks the `+` created — the ones the TASKS module offers to delete. */
export function userTasks(tasks: TaskDef[]): TaskDef[] {
  return tasks.filter(canDeleteTask);
}

/**
 * The agent's namespace for a task derived from an installed skill.
 * `skill:humanizer`, `skill:forge`, … — 129 of them on the live instance.
 */
const SKILL_ID_PREFIX = "skill:";

/**
 * What the TASKS module should actually list: everything pressable, minus the
 * skill-derived tasks.
 *
 * The module used to list `userTasks()` alone and count `runs.length`. On a
 * fresh instance both are zero, so a machine with 134 registered tasks — five
 * of them the built-in buttons this product is organised around: process
 * backlog, re-extract, morning brief, weekly review, run audit — rendered the
 * number 0 and an empty state. Everything it said was true and it made the
 * feature look absent, which is the same failure as the skills that were on
 * disk and reported as one.
 *
 * Skill tasks are excluded rather than shown because SKILLS already lists all
 * 129 with their own descriptions and panel. Repeating them here would bury the
 * five buttons among them, which is how they became invisible in the first
 * place.
 */
export function pressableTasks(tasks: TaskDef[]): TaskDef[] {
  return tasks.filter((task) => !task.id.startsWith(SKILL_ID_PREFIX));
}
