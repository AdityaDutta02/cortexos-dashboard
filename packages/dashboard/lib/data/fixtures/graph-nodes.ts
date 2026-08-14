/**
 * The node set behind the centre canvas. Big enough that the graph reads as a
 * real graph rather than a diagram — degree and tier are what drive size and
 * colour, so they are set deliberately rather than derived from the edge list.
 */

import type { GraphNode } from "cortexos-types";

interface Row {
  path: string;
  label: string;
  tier: 0 | 1 | 2;
  degree: number;
  retrievalCount: number;
  updatedAt: string;
  proposed?: boolean;
}

const ROWS: Row[] = [
  { path: "30-resources/implementation-bottleneck.md", label: "Implementation bottleneck", tier: 2, degree: 11, retrievalCount: 31, updatedAt: "2026-08-05T14:10:00.000Z" },
  { path: "insights/expansion-over-acquisition.md", label: "Expansion over acquisition", tier: 2, degree: 8, retrievalCount: 12, updatedAt: "2026-08-04T06:50:00.000Z" },
  { path: "10-projects/series-b-narrative.md", label: "Series B narrative", tier: 2, degree: 7, retrievalCount: 23, updatedAt: "2026-08-09T09:20:00.000Z" },
  { path: "20-areas/pricing-policy.md", label: "Pricing policy", tier: 2, degree: 6, retrievalCount: 18, updatedAt: "2026-08-06T08:15:00.000Z" },
  { path: "10-projects/clinical-ops-hiring.md", label: "Clinical ops hiring", tier: 2, degree: 6, retrievalCount: 14, updatedAt: "2026-08-08T16:05:00.000Z" },
  { path: "insights/constraint-moves-it-does-not-disappear.md", label: "The constraint moves", tier: 2, degree: 5, retrievalCount: 4, updatedAt: "2026-08-10T07:19:00.000Z" },
  { path: "30-resources/transcripts/board-meeting-2026-07-28.md", label: "Board meeting 28 Jul", tier: 2, degree: 5, retrievalCount: 21, updatedAt: "2026-07-28T17:00:00.000Z" },
  { path: "30-resources/net-retention-thesis.md", label: "Net retention thesis", tier: 1, degree: 4, retrievalCount: 9, updatedAt: "2026-07-11T08:30:00.000Z" },
  { path: "30-resources/enterprise-deal-desk-notes.md", label: "Deal desk notes", tier: 1, degree: 4, retrievalCount: 9, updatedAt: "2026-07-19T13:45:00.000Z" },
  { path: "insights/discipline-beats-discretion.md", label: "Discipline beats discretion", tier: 1, degree: 4, retrievalCount: 6, updatedAt: "2026-07-21T07:15:00.000Z" },
  { path: "20-areas/operating-cadence.md", label: "Operating cadence", tier: 1, degree: 4, retrievalCount: 7, updatedAt: "2026-07-22T07:05:00.000Z" },
  { path: "10-projects/vendor-consolidation.md", label: "Vendor consolidation", tier: 1, degree: 4, retrievalCount: 5, updatedAt: "2026-07-30T11:40:00.000Z" },
  { path: "30-resources/clinical-review-sla.md", label: "Clinical review SLA", tier: 1, degree: 3, retrievalCount: 8, updatedAt: "2026-08-07T10:00:00.000Z" },
  { path: "20-areas/team-structure.md", label: "Team structure", tier: 1, degree: 3, retrievalCount: 4, updatedAt: "2026-07-15T09:00:00.000Z" },
  { path: "30-resources/transcripts/leadership-2026-08-03.md", label: "Leadership sync 3 Aug", tier: 1, degree: 3, retrievalCount: 11, updatedAt: "2026-08-03T10:20:00.000Z" },
  { path: "30-resources/transcripts/hiring-panel-2026-08-06.md", label: "Hiring panel 6 Aug", tier: 1, degree: 3, retrievalCount: 3, updatedAt: "2026-08-06T15:00:00.000Z" },
  { path: "30-resources/customer-expansion-playbook.md", label: "Expansion playbook", tier: 1, degree: 3, retrievalCount: 6, updatedAt: "2026-08-02T09:30:00.000Z" },
  { path: "20-areas/board-relations.md", label: "Board relations", tier: 1, degree: 3, retrievalCount: 5, updatedAt: "2026-07-29T19:30:00.000Z" },
  { path: "30-resources/contracts/analytics-vendor-contract.md", label: "Analytics contract", tier: 1, degree: 2, retrievalCount: 3, updatedAt: "2026-06-14T12:00:00.000Z" },
  { path: "30-resources/sales-comp-plan.md", label: "Sales comp plan", tier: 1, degree: 2, retrievalCount: 0, updatedAt: "2026-07-02T09:00:00.000Z", proposed: true },
  { path: "30-resources/contracts/implementation-sow-template.md", label: "Implementation SOW", tier: 0, degree: 1, retrievalCount: 0, updatedAt: "2026-05-02T09:00:00.000Z" },
  { path: "30-resources/onboarding-runbook.md", label: "Onboarding runbook", tier: 0, degree: 1, retrievalCount: 1, updatedAt: "2026-03-11T09:00:00.000Z" },
  { path: "40-archive/2025-platform-migration.md", label: "2025 platform migration", tier: 0, degree: 1, retrievalCount: 2, updatedAt: "2025-11-18T10:00:00.000Z" },
];

export const GRAPH_NODES: GraphNode[] = ROWS.map((r) => ({
  id: r.path,
  label: r.label,
  path: r.path,
  tier: r.tier,
  degree: r.degree,
  retrievalCount: r.retrievalCount,
  updatedAt: r.updatedAt,
  proposed: r.proposed ?? false,
}));
