/**
 * Layer 1 edges, the audit, and the contradiction register.
 * Nodes live in ./graph-nodes so neither file grows past reviewable size.
 */

import type { Contradiction, GraphAudit, GraphEdge, Provenance } from "cortexos-types";

export { GRAPH_NODES } from "./graph-nodes";

function prov(sourceFile: string, confidence: number, runId: string): Provenance {
  return {
    sourceFile,
    chunkOffset: 2048,
    chunkLength: 1180,
    model: "sonnet",
    extractedAt: "2026-08-10T07:16:00.000Z",
    confidence,
    extractionRunId: runId,
  };
}

const E = (
  source: string,
  relation: string,
  target: string,
  confidence?: number,
): GraphEdge => ({
  source,
  relation,
  target,
  provenance: confidence === undefined ? undefined : prov(source, confidence, "ex_0810a"),
  proposed: confidence !== undefined && confidence < 0.6,
});

const BOTTLENECK = "30-resources/implementation-bottleneck.md";
const EXPANSION = "insights/expansion-over-acquisition.md";
const SERIESB = "10-projects/series-b-narrative.md";
const PRICING = "20-areas/pricing-policy.md";
const HIRING = "10-projects/clinical-ops-hiring.md";
const CONSTRAINT = "insights/constraint-moves-it-does-not-disappear.md";
const BOARD = "30-resources/transcripts/board-meeting-2026-07-28.md";
const RETENTION = "30-resources/net-retention-thesis.md";
const DEALDESK = "30-resources/enterprise-deal-desk-notes.md";
const DISCIPLINE = "insights/discipline-beats-discretion.md";
const CADENCE = "20-areas/operating-cadence.md";
const VENDOR = "10-projects/vendor-consolidation.md";
const SLA = "30-resources/clinical-review-sla.md";
const TEAM = "20-areas/team-structure.md";
const LEADERSHIP = "30-resources/transcripts/leadership-2026-08-03.md";
const PANEL = "30-resources/transcripts/hiring-panel-2026-08-06.md";
const PLAYBOOK = "30-resources/customer-expansion-playbook.md";
const BOARDREL = "20-areas/board-relations.md";
const CONTRACT = "30-resources/contracts/analytics-vendor-contract.md";
const COMP = "30-resources/sales-comp-plan.md";
const SOW = "30-resources/contracts/implementation-sow-template.md";
const RUNBOOK = "30-resources/onboarding-runbook.md";
const MIGRATION = "40-archive/2025-platform-migration.md";

export const GRAPH_EDGES: GraphEdge[] = [
  E(BOTTLENECK, "causes", HIRING, 0.91),
  E(BOTTLENECK, "proves", CONSTRAINT, 0.88),
  E(SLA, "proves", BOTTLENECK, 0.84),
  E(TEAM, "causes", BOTTLENECK, 0.77),
  E(MIGRATION, "instance-of", CONSTRAINT, 0.72),
  E(BOARD, "feeds", BOTTLENECK, 0.93),
  E(BOARD, "feeds", SERIESB, 0.9),
  E(RETENTION, "proves", EXPANSION),
  E(BOTTLENECK, "depends-on", EXPANSION, 0.81),
  E(PLAYBOOK, "instance-of", EXPANSION, 0.79),
  E(COMP, "contradicts", EXPANSION, 0.41),
  E(LEADERSHIP, "causes", EXPANSION, 0.86),
  E(SERIESB, "proves", RETENTION),
  E(DEALDESK, "contradicts", PRICING, 0.79),
  E(PRICING, "proves", DISCIPLINE),
  E(DEALDESK, "proves", DISCIPLINE, 0.74),
  E(PANEL, "contradicts", CADENCE, 0.68),
  E(PANEL, "feeds", HIRING, 0.8),
  E(CADENCE, "has-part", BOARDREL),
  E(BOARDREL, "part-of", SERIESB),
  E(VENDOR, "depends-on", CONTRACT),
  E(VENDOR, "causes", TEAM, 0.63),
  E(HIRING, "depends-on", SLA, 0.76),
  E(SOW, "part-of", HIRING),
  E(RUNBOOK, "part-of", SLA),
  E(LEADERSHIP, "feeds", CADENCE, 0.7),
  E(PRICING, "supersedes", DEALDESK, 0.55),
  E(CONSTRAINT, "extends-concept", TEAM, 0.66),

  /*
   * Untyped `[[wikilinks]]`, emitted by the pipeline as `references`.
   *
   * They belong in the fixture because they are the majority of the real
   * graph — 316 of 563 notes carry wikilinks and no `## Edges` section — and
   * because the styleguide has to show what the quiet grey class looks like
   * beside a coloured one. They are deduplicated against typed edges upstream,
   * so no pair here carries both.
   */
  E(SERIESB, "references", PRICING),
  E(SERIESB, "references", TEAM),
  E(BOARD, "references", CADENCE),
  E(BOARD, "references", COMP),
  E(RUNBOOK, "references", TEAM),
  E(PLAYBOOK, "references", RETENTION),
  E(MIGRATION, "references", VENDOR),
  E(SOW, "references", CONTRACT),
];

/**
 * `nodeA`/`nodeB` are ids and `pathA`/`pathB` are paths, and the two are
 * carried separately even here — where this fixture's ids happen to *be*
 * paths, because its graph predates the live agent's `nodeIds: basename`.
 *
 * Writing `pathA` out rather than reusing the id is the point: a panel that
 * reads `pathA` keeps working when the ids become titles, and one that reads
 * `nodeA` breaks the moment it meets a real vault. That is exactly how the
 * "NOT FOUND — no note at Forge Is Directing AI Like A Team" bug survived
 * offline testing.
 */
export const CONTRADICTIONS: Contradiction[] = [
  {
    id: "cx_01",
    nodeA: PRICING,
    nodeB: DEALDESK,
    pathA: PRICING,
    pathB: DEALDESK,
    statementA: "Discounts are approved by exception only, and every exception is written down.",
    statementB: "The last four enterprise deals all closed a full band below list.",
    detectedAt: "2026-08-07T11:02:00.000Z",
    status: "open",
  },
  {
    id: "cx_02",
    nodeA: EXPANSION,
    nodeB: COMP,
    pathA: EXPANSION,
    pathB: COMP,
    statementA: "Every new logo consumes the scarce implementation resource; expansion does not.",
    statementB: "New-logo bookings carry the higher accelerator.",
    detectedAt: "2026-08-09T08:40:00.000Z",
    status: "open",
  },
  {
    id: "cx_03",
    nodeA: CADENCE,
    nodeB: PANEL,
    pathA: CADENCE,
    pathB: PANEL,
    statementA: "Nothing is decided in a meeting that could have been decided in the doc.",
    statementB: "The hiring decision was taken live, with no pre-read.",
    detectedAt: "2026-08-06T16:10:00.000Z",
    status: "open",
  },
  {
    id: "cx_00",
    nodeA: CADENCE,
    nodeB: BOARDREL,
    pathA: CADENCE,
    pathB: BOARDREL,
    statementA: "Pre-reads go out Thursday, no exceptions.",
    statementB: "Board pre-reads went out Friday for the last two meetings.",
    detectedAt: "2026-06-30T09:00:00.000Z",
    status: "resolved",
    resolutionNote: "Cadence updated: pre-reads move to Thursday 5pm, hard stop.",
  },
];

export const AUDIT: GraphAudit = {
  generatedAt: "2026-08-10T07:20:00.000Z",
  orphanNodes: [MIGRATION, RUNBOOK],
  danglingEdges: [E(VENDOR, "depends-on", "30-resources/contracts/observability-msa.md")],
  lowConfidenceDensity: 0.14,
  contradictions: CONTRADICTIONS.filter((c) => c.status === "open"),
  neverRetrieved: [COMP, SOW],
  // Two real shapes seen in the live vault: a YAML flow sequence followed by a
  // comma, and a quoted string followed by more text. Both silently discard the
  // whole frontmatter block, so tags/updated/tier read as absent.
  malformedFrontmatter: [
    { path: "Insights/Built But Invisible.md", error: "line 4: expected <block end>, but found ','" },
    { path: "_Backlog/Behind Your Tech.md", error: "line 3: expected <block end>, but found scalar" },
  ],
  expiredStamps: [CONTRACT],
};

/** The "what the graph connected" digest — one line each, by design. */
export const CONNECTED_DIGEST: { summary: string; nodes: string[]; at: string }[] = [
  {
    summary: "Hiring plan and comp plan pull in opposite directions.",
    nodes: [HIRING, COMP, EXPANSION],
    at: "2026-08-10T07:19:00.000Z",
  },
  {
    summary: "The constraint moved from engineering to clinical review — same blind spot.",
    nodes: [CONSTRAINT, BOTTLENECK, MIGRATION],
    at: "2026-08-10T07:19:00.000Z",
  },
  {
    summary: "Retention story rests on three implementation-light accounts.",
    nodes: [SERIESB, RETENTION, BOTTLENECK],
    at: "2026-08-09T09:25:00.000Z",
  },
  {
    summary: "Analytics notice window opens before the consolidation decision is due.",
    nodes: [VENDOR, CONTRACT],
    at: "2026-08-08T12:00:00.000Z",
  },
];
