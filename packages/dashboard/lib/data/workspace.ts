/**
 * TWO LOADS, NOT ONE, AND THE SPLIT IS BY LATENCY.
 *
 * This began as "one screen means one load": fourteen calls, one loading state,
 * one error state. It is a clean idea and on the deployed instance it produced
 * a ten-second blank screen, because a single loading state is as slow as its
 * slowest member and `getHomeSummary` waits on a graph audit that costs 1.9s
 * warm and 18.4s cold. Everything else had to wait behind vault-hygiene
 * statistics nobody was looking at yet.
 *
 * So the calls are split by how long they take, not by what they mean:
 *
 *   CORE  graph, config, tasks    — ~300ms each. The screen cannot be drawn
 *                                   without them, and it does not have to wait
 *                                   for anything else.
 *   REST  the other eleven        — arrive when they arrive, into modules that
 *                                   show a skeleton until they do.
 *
 * Both start at the same moment; they are two awaits, not two round trips.
 *
 * Resilience is unchanged, and matters more against a live agent than a mock: a
 * real deployment can have an empty profile, no outputs yet, or a connector
 * subsystem that is briefly unavailable. A CORE failure is an error screen,
 * because there is nothing to draw. Everything in REST degrades to empty and
 * says so in `partial` rather than blanking the screen.
 */

import type {
  Belief,
  ConnectorInfo,
  Contradiction,
  CortexConfig,
  GraphAudit,
  GraphNeighborhood,
  HomeSummary,
  IngestProgress,
  ObservedSignals,
  OutputArtifact,
  SkillInfo,
  SuppressedBelief,
  TaskDef,
} from "cortexos-types";
import { ds } from "./index";

export interface WorkspaceData {
  /**
   * `null` until the slow half of the load arrives — see the file header. Not
   * a zeroed placeholder: `HomeSummary` carries `health`, and a fabricated
   * "everything is fine" shown before anything has been checked is the one
   * default that could actually mislead. Every consumer handles the null and
   * shows a skeleton.
   */
  summary: HomeSummary | null;
  graph: GraphNeighborhood;
  config: CortexConfig;
  contradictions: Contradiction[];
  ingest: IngestProgress;
  outputs: OutputArtifact[];
  beliefs: Belief[];
  suppressed: SuppressedBelief[];
  signals: ObservedSignals;
  tasks: TaskDef[];
  /**
   * Skills that exist on disk, wherever they live — repo, adopted vault, or
   * the user's own `~/.claude`. Never `config.skills.enabled`; see below.
   */
  skills: SkillInfo[];
  /** Configured-but-absent skills, so the gap can be shown honestly. */
  skillsMissing: string[];
  /** Discovered MCP connectors. `[]` is a truthful answer, not a failure. */
  connectors: ConnectorInfo[];
  /**
   * The graph audit — orphans, dangling edges, and the notes whose frontmatter
   * will not parse. Vault hygiene that is invisible unless something renders
   * it: 47 notes on the live vault silently lose their `tags`, `updated` and
   * `tier`, and 45 of those are the entire `Insights/` synthesis layer.
   */
  audit: GraphAudit | null;
  /** Endpoints that failed but were not fatal — surfaced, never swallowed. */
  partial: string[];
}

const EMPTY_INGEST: IngestProgress = {
  byStage: {
    convert: { done: 0, total: 0 },
    group: { done: 0, total: 0 },
    embed: { done: 0, total: 0 },
    rank: { done: 0, total: 0 },
    extract: { done: 0, total: 0 },
    verify: { done: 0, total: 0 },
  },
  backpressure: false,
};

const EMPTY_SIGNALS: ObservedSignals = {
  workingHours: { start: "", end: "", timezone: "" },
  unreachableWindows: [],
  skillUsage: [],
  frequentDocuments: [],
  heavilyEditedSkills: [],
  repeatedQuestions: [],
};

/** Runs a non-critical call, recording the failure instead of throwing. */
async function soft<T>(label: string, run: () => Promise<T>, fallback: T, partial: string[]) {
  try {
    return await run();
  } catch {
    partial.push(label);
    return fallback;
  }
}

/** What the screen cannot be drawn without. All of it is fast. */
export interface CoreData {
  graph: GraphNeighborhood;
  config: CortexConfig;
  tasks: TaskDef[];
}

/** Everything else, including the slow audit-backed summary. */
export type RestData = Omit<WorkspaceData, keyof CoreData>;

export async function loadCore(): Promise<CoreData> {
  const [graph, config, tasks] = await Promise.all([
    ds.getGraph({ limit: 2000 }),
    ds.getConfig(),
    // Moved out of the slow half: `tasks` is a cheap in-memory list on the
    // agent and the graph is unreadable without the buttons beside it.
    ds.listTasks(),
  ]);
  return { graph, config, tasks };
}

export async function loadRest(): Promise<RestData> {
  const partial: string[] = [];

  const [
    summary,
    contradictions,
    ingest,
    outputsPage,
    beliefs,
    suppressed,
    signals,
    skills,
    skillsReport,
    connectors,
    audit,
  ] = await Promise.all([
    /*
     * `getHomeSummary` is the slow one — it waits on the graph audit. It is in
     * this half rather than CORE for exactly that reason, and everything it
     * feeds (health chip, headroom, ingest backlog, the graph's stale/fresh
     * rings) is additive to a screen that already works without it.
     *
     * Soft, unlike before: it used to be load-bearing, so a single failing
     * subsystem blanked the whole dashboard. Nothing it carries is worth that.
     */
    soft("home summary", () => ds.getHomeSummary(), null, partial),
    soft("contradictions", () => ds.listContradictions(), [], partial),
    /*
     * `listSources()` is deliberately NOT loaded. It returns `cortex.yaml`'s
     * five `ingest.sources` template entries — upload/folder/gdrive/email/drop
     * bridge, none of them configured — which is what the Connectors module
     * used to render as five healthy connectors. Connectors come from
     * `listConnectors()` and nothing else.
     */
    soft("ingest progress", () => ds.getIngestProgress(), EMPTY_INGEST, partial),
    soft("outputs", () => ds.listOutputs(), { items: [] }, partial),
    soft("beliefs", () => ds.listBeliefs(), [], partial),
    soft("suppressed beliefs", () => ds.listSuppressed(), [], partial),
    soft("observed signals", () => ds.getObservedSignals(), EMPTY_SIGNALS, partial),
    /*
     * Skills and connectors come from these three calls and from nowhere else.
     *
     * Not `config.skills.enabled`: a wish list — the shipped template names
     * five skills and this repo contains one — so rendering it produced four
     * phantom skills whose buttons would fail on click.
     */
    soft("skills", () => ds.listSkills(), [], partial),
    soft(
      "skills report",
      () => ds.getSkillsReport(),
      { installed: [], missing: [], unlisted: [] },
      partial,
    ),
    soft("connectors", () => ds.listConnectors(), [], partial),
    soft("graph audit", () => ds.getAudit(), null, partial),
  ]);

  return {
    summary,
    contradictions,
    ingest,
    outputs: outputsPage.items,
    beliefs,
    suppressed,
    signals,
    // The report carries the same records, so if one of the two calls soft
    // failed the module still renders rather than claiming zero skills.
    skills: skills.length > 0 ? skills : skillsReport.installed,
    skillsMissing: skillsReport.missing,
    connectors,
    audit,
    partial,
  };
}

/**
 * The shape the whole UI reads, assembled from whichever halves have arrived.
 * REST is absent for the first moment of every load, so its fields fall back to
 * empty values and each module decides whether to draw a skeleton — the
 * alternative, optional fields everywhere, would push that decision into forty
 * call sites.
 */
const EMPTY_REST: RestData = {
  summary: null,
  contradictions: [],
  ingest: EMPTY_INGEST,
  outputs: [],
  beliefs: [],
  suppressed: [],
  signals: EMPTY_SIGNALS,
  skills: [],
  skillsMissing: [],
  connectors: [],
  audit: null,
  partial: [],
};

export function mergeWorkspace(core: CoreData, rest: RestData | null): WorkspaceData {
  return { ...core, ...(rest ?? EMPTY_REST) };
}

/**
 * The backlog task's id, discovered rather than hardcoded.
 *
 * The live agent uses `process-backlog`; the fixtures used `process_backlog`.
 * Hardcoding either one breaks against the other, and a wrong task id is a
 * silent 404 behind a button the user just pressed.
 */
