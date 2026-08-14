/**
 * What the right-hand side panel is currently showing.
 *
 * The rule this type exists to enforce: when data does not fit in its rail
 * module, the module does not shrink the data — it becomes clickable and hands
 * a target to the panel. One slot, one component, many content kinds.
 */
export type PanelTarget =
  /** A vault note, rendered as markdown. */
  | { kind: "note"; path: string }
  /**
   * One run: its full log, what it wrote, the trickle units it drained.
   *
   * `label` is for a run that was started a moment ago and is not in the
   * workspace's run list yet — without it the header of a run the user just
   * pressed reads "Run", which is the least useful moment to lose the name.
   */
  | { kind: "run"; id: string; label?: string }
  /** An open contradiction — the two statements, side by side. */
  | { kind: "contradiction"; id: string }
  /**
   * Every open contradiction. The rail module shows the first few and hands
   * the rest here rather than growing until it starves the module above it.
   */
  | { kind: "contradictions" }
  /** Everything past its freshness window. */
  | { kind: "stale" }
  /** The full system-health issue list. */
  | { kind: "health" }
  | { kind: "connector"; id: string }
  | { kind: "add-connector" }
  | { kind: "skill"; name: string }
  /** The /new-skill factory — produces a prompt to paste into Claude. */
  | { kind: "new-skill" }
  /** One task the user created: run it, or delete it. */
  | { kind: "task"; id: string }
  /**
   * The task factory, and the two different things it makes. `mode` is on the
   * target rather than inside the panel so the header can name the branch —
   * "a button CORTEX can press" is the wrong title for a flow that ends in a
   * prompt CORTEX cannot register.
   *
   * - absent — pick a kind first.
   * - `"button"` — CORTEX creates it; it is pressable when the flow ends.
   * - `"routine"` — CORTEX writes a prompt; the user registers it in Claude.
   */
  // `job` is the describe-it-in-words branch — see NewTaskPanel.
  | { kind: "new-task"; mode?: "button" | "routine" | "job" }
  | { kind: "profile" }
  | { kind: "settings" };

/** True when the panel is showing something anchored to a graph node. */
export function panelNodePath(target: PanelTarget | null): string | null {
  return target?.kind === "note" ? target.path : null;
}
