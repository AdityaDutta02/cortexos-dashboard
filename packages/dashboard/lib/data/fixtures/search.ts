/**
 * Search corpus. Every hit carries a citation — spec §6.4 makes that
 * mandatory, so the fixture cannot model an uncited hit even by accident.
 */

import type { SearchHit } from "cortexos-types";

export const SEARCH_HITS: SearchHit[] = [
  {
    id: "hit_01",
    path: "30-resources/implementation-bottleneck.md",
    title: "Implementation bottleneck",
    snippet:
      "Time-to-first-value is gated by <mark>clinical review</mark>, not engineering. Every quarter we have blamed the wrong team.",
    tier: 2,
    score: 0.94,
    matchedBy: ["keyword", "semantic"],
    citation: {
      sourceFile: "30-resources/transcripts/board-meeting-2026-07-28.md",
      sourceDate: "2026-07-28",
      label: "Board meeting — 28 Jul 2026, 00:41:12",
    },
    provenance: {
      sourceFile: "30-resources/transcripts/board-meeting-2026-07-28.md",
      chunkOffset: 18_420,
      chunkLength: 1_240,
      model: "sonnet",
      extractedAt: "2026-08-10T07:16:00.000Z",
      confidence: 0.91,
      extractionRunId: "ex_0810a",
    },
    proposed: false,
  },
  {
    id: "hit_02",
    path: "20-areas/pricing-policy.md",
    title: "Pricing policy",
    snippet:
      "Discounts are approved by <mark>exception</mark> only and every exception is written down. Multi-year gets term, not discount.",
    tier: 2,
    score: 0.81,
    matchedBy: ["keyword"],
    citation: {
      sourceFile: "20-areas/pricing-policy.md",
      sourceDate: "2026-08-06",
      label: "Pricing policy v4.docx, p.1",
    },
    proposed: false,
  },
  {
    id: "hit_03",
    path: "30-resources/sales-comp-plan.md",
    title: "Sales comp plan",
    snippet: "New-logo bookings carry the higher <mark>accelerator</mark>.",
    tier: 1,
    score: 0.54,
    matchedBy: ["semantic"],
    citation: {
      sourceFile: "30-resources/sales-comp-plan.md",
      sourceDate: "2026-07-02",
      label: "Sales comp plan FY26, p.3",
    },
    provenance: {
      sourceFile: "30-resources/sales-comp-plan.md",
      chunkOffset: 3_100,
      chunkLength: 780,
      model: "haiku",
      extractedAt: "2026-08-10T07:17:00.000Z",
      confidence: 0.41,
      extractionRunId: "ex_0810b",
    },
    proposed: true,
  },
];
