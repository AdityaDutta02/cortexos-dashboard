import type { ConnectorInfo, DiscoverySource, SkillInfo } from "cortexos-types";

/**
 * Where a skill or connector came from, and whether CORTEX can actually use it.
 *
 * Phase 1 adopts a second brain that already exists (spec §16.2), and that
 * brain already has its own skills and MCP servers — configured in Claude, not
 * in `cortex.yaml`. Reading only the repo reported **1 skill and 0 connectors**
 * against 12 MCP servers in `~/.claude.json`, 2 more in Claude Desktop, 3
 * skills in the vault and dozens under `~/.claude/skills/` (found live,
 * 2026-08-11).
 *
 * Showing them is only half the fix. A connector configured in the user's
 * Claude is real and worth seeing, but CORTEX may not be able to call it — so
 * origin and reachability are rendered, never flattened into a single "ok".
 */

const SOURCES: readonly DiscoverySource[] = [
  "repo",
  "vault",
  "user",
  "claude_desktop",
  "config",
];

/**
 * A runtime guard on a field the type declares as required.
 *
 * That is deliberate: `source` and `invocable` were added to `cortexos-types` on
 * 2026-08-11 and an agent that has not shipped the discovery pass yet omits
 * them. An omitted origin must render as *nothing* — an unlabelled row is
 * honest, a row labelled "repo" by default is a lie about where the user's
 * skill lives.
 */
export function isDiscoverySource(value: unknown): value is DiscoverySource {
  return typeof value === "string" && (SOURCES as readonly string[]).includes(value);
}

/** Short mono tag for a row. Lowercase — it is a label, not a sentence. */
export function sourceTag(value: unknown): string | null {
  if (!isDiscoverySource(value)) return null;
  switch (value) {
    case "repo":
      return "cortex";
    case "vault":
      return "vault";
    case "user":
      return "yours";
    case "claude_desktop":
      return "desktop";
    case "config":
      return "config";
  }
}

/** The same fact in a sentence, for tooltips and the side panel. */
export function sourceSentence(value: unknown): string | null {
  if (!isDiscoverySource(value)) return null;
  switch (value) {
    case "repo":
      return "Shipped with CORTEX, in this repo.";
    case "vault":
      return "Configured in your vault's own .claude folder.";
    case "user":
      return "Yours — configured in ~/.claude, available in every Claude session.";
    case "claude_desktop":
      return "Configured in Claude Desktop.";
    case "config":
      return "Declared in cortex.yaml.";
  }
}

/**
 * Three states, not two. `null` means the agent did not say — which is not the
 * same as "no", and must not be rendered as one.
 */
export function knownBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

export function canCortexRun(skill: SkillInfo): boolean | null {
  return knownBoolean(skill.invocable);
}

export function canCortexReach(connector: ConnectorInfo): boolean | null {
  return knownBoolean(connector.reachableByCortex);
}

/**
 * Reachable first, then everything else, each group alphabetical.
 *
 * The ones CORTEX can act on are the ones a click does something with, so they
 * lead. The rest are not hidden or greyed into invisibility — they are the
 * user's real connectors and they belong on screen.
 */
export function byUsefulnessThenName<T extends { label: string }>(
  items: T[],
  usable: (item: T) => boolean | null,
): T[] {
  const rank = (item: T): number => (usable(item) === false ? 1 : 0);
  return [...items].sort((a, b) => rank(a) - rank(b) || a.label.localeCompare(b.label));
}
