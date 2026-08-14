/**
 * The seed corpus: Rohan Mehta, co-founder/CEO of Arbor Health — a B2B
 * clinical-operations company. Board, a hiring push, vendor contracts,
 * meeting transcripts and a pricing doc.
 *
 * Hard rule: NO money figures anywhere in this file. Magnitude is expressed
 * in words ("materially above list", "a full band") and never in numbers.
 */

import type { Note, NoteRef, Tier } from "cortexos-types";

interface Seed {
  path: string;
  title: string;
  updatedAt: string;
  tier: Tier;
  body: string;
}

const SEEDS: Seed[] = [
  {
    path: "10-projects/series-b-narrative.md",
    title: "Series B narrative",
    updatedAt: "2026-08-09T09:20:00.000Z",
    tier: 2,
    body:
      "The story we tell is retention, not logos. Three of the four largest accounts\n" +
      "expanded without a sales touch, which is the only proof point the board has\n" +
      "never argued with.\n\n## Edges\ncauses:: [[Board Meeting 2026-07-28]]\nproves:: [[Net Retention Thesis]]\n",
  },
  {
    path: "10-projects/clinical-ops-hiring.md",
    title: "Clinical ops hiring push",
    updatedAt: "2026-08-08T16:05:00.000Z",
    tier: 2,
    body:
      "Eight open roles, six of them implementation. We agreed to stop hiring\n" +
      "generalist CSMs and hire nurses who can read a chart.\n\n## Edges\n" +
      "depends-on:: [[Implementation Bottleneck]]\ninstance-of:: [[Hire For The Bottleneck]]\n",
  },
  {
    path: "10-projects/vendor-consolidation.md",
    title: "Vendor consolidation",
    updatedAt: "2026-07-30T11:40:00.000Z",
    tier: 1,
    body:
      "Nine observability and data vendors down to four. The blocker is the\n" +
      "24-month term on the analytics contract, not the switching work.\n\n## Edges\n" +
      "depends-on:: [[Analytics Vendor Contract]]\ncauses:: [[Platform Team Roadmap]]\n",
  },
  {
    path: "20-areas/pricing-policy.md",
    title: "Pricing policy",
    updatedAt: "2026-08-06T08:15:00.000Z",
    tier: 2,
    body:
      "One list price per seat band. Discounts are approved by exception only and\n" +
      "every exception is written down. Multi-year gets term, not discount.\n\n## Edges\n" +
      "contradicts:: [[Enterprise Deal Desk Notes]]\nproves:: [[Discipline Beats Discretion]]\n",
  },
  {
    path: "20-areas/board-relations.md",
    title: "Board relations",
    updatedAt: "2026-07-29T19:30:00.000Z",
    tier: 1,
    body:
      "Two independents, one of whom reads the pre-read and one of whom does not.\n" +
      "Pre-reads go out on the Thursday, no exceptions.\n\n## Edges\n" +
      "part-of:: [[Operating Cadence]]\n",
  },
  {
    path: "20-areas/operating-cadence.md",
    title: "Operating cadence",
    updatedAt: "2026-07-22T07:05:00.000Z",
    tier: 1,
    body:
      "Monday leadership, Wednesday metrics, Thursday written update. Nothing is\n" +
      "decided in a meeting that could have been decided in the doc.\n\n## Edges\n" +
      "has-part:: [[Board Relations]]\n",
  },
  {
    path: "30-resources/transcripts/board-meeting-2026-07-28.md",
    title: "Board meeting — 28 Jul 2026",
    updatedAt: "2026-07-28T17:00:00.000Z",
    tier: 2,
    body:
      "Transcript. Key moments: the retention slide landed; the hiring plan did not.\n" +
      "Priya pushed hard on implementation capacity being the real constraint.\n\n## Edges\n" +
      "feeds:: [[Series B Narrative]]\nfeeds:: [[Implementation Bottleneck]]\n",
  },
  {
    path: "30-resources/transcripts/leadership-2026-08-03.md",
    title: "Leadership sync — 3 Aug 2026",
    updatedAt: "2026-08-03T10:20:00.000Z",
    tier: 1,
    body:
      "Decided to freeze new logo targets for one quarter and put the sales team on\n" +
      "expansion. Nobody in the room disagreed, which is itself worth noting.\n\n## Edges\n" +
      "causes:: [[Expansion Over Acquisition]]\n",
  },
  {
    path: "30-resources/contracts/analytics-vendor-contract.md",
    title: "Analytics vendor contract",
    updatedAt: "2026-06-14T12:00:00.000Z",
    tier: 1,
    body:
      "24-month term, auto-renew with a 90-day notice window. Notice window opens\n" +
      "in October. (as-of 2026-06-14)\n\n## Edges\n" +
      "part-of:: [[Vendor Consolidation]]\n",
  },
  {
    path: "30-resources/contracts/implementation-sow-template.md",
    title: "Implementation SOW template",
    updatedAt: "2026-05-02T09:00:00.000Z",
    tier: 0,
    body: "Standard statement of work. Scope, milestones, acceptance criteria.\n",
  },
  {
    path: "30-resources/enterprise-deal-desk-notes.md",
    title: "Enterprise deal desk notes",
    updatedAt: "2026-07-19T13:45:00.000Z",
    tier: 1,
    body:
      "In practice the last four enterprise deals all closed a full band below list.\n" +
      "The exception process is being used as the process.\n\n## Edges\n" +
      "contradicts:: [[Pricing Policy]]\n",
  },
  {
    path: "30-resources/implementation-bottleneck.md",
    title: "Implementation bottleneck",
    updatedAt: "2026-08-05T14:10:00.000Z",
    tier: 2,
    body:
      "Time-to-first-value is gated by clinical review, not engineering. Every\n" +
      "quarter we have blamed the wrong team.\n\n## Edges\n" +
      "proves:: [[Hire For The Bottleneck]]\ncauses:: [[Clinical Ops Hiring Push]]\n",
  },
  {
    path: "30-resources/net-retention-thesis.md",
    title: "Net retention thesis",
    updatedAt: "2026-07-11T08:30:00.000Z",
    tier: 1,
    body:
      "Expansion inside existing accounts outperforms new logo acquisition at our\n" +
      "stage, because implementation is the constraint and existing accounts skip it.\n",
  },
  {
    path: "insights/expansion-over-acquisition.md",
    title: "Expansion over acquisition",
    updatedAt: "2026-08-04T06:50:00.000Z",
    tier: 2,
    body:
      "derived-from: [[Net Retention Thesis]], [[Implementation Bottleneck]], [[Leadership Sync 2026-08-03]]\n\n" +
      "If implementation is the constraint, then every new logo consumes the scarce\n" +
      "resource and every expansion does not. The hiring plan and the sales comp plan\n" +
      "currently point in opposite directions.\n",
  },
  {
    path: "insights/discipline-beats-discretion.md",
    title: "Discipline beats discretion",
    updatedAt: "2026-07-21T07:15:00.000Z",
    tier: 1,
    body:
      "derived-from: [[Pricing Policy]], [[Enterprise Deal Desk Notes]]\n\n" +
      "A policy with an exception path becomes the exception path. The gap is not a\n" +
      "pricing problem, it is an approval-authority problem.\n",
  },
  {
    path: "30-resources/clinical-review-sla.md",
    title: "Clinical review SLA",
    updatedAt: "2026-08-07T10:00:00.000Z",
    tier: 1,
    body:
      "Five working days, measured from chart handoff. We have missed it in eleven of the\n" +
      "last fourteen implementations.\n\n## Edges\nproves:: [[Implementation Bottleneck]]\n",
  },
  {
    path: "30-resources/customer-expansion-playbook.md",
    title: "Customer expansion playbook",
    updatedAt: "2026-08-02T09:30:00.000Z",
    tier: 1,
    body:
      "Expansion motions that skip implementation entirely: added departments on an\n" +
      "existing contract, and seat growth inside a live site.\n\n## Edges\n" +
      "instance-of:: [[Expansion Over Acquisition]]\n",
  },
  {
    path: "30-resources/transcripts/hiring-panel-2026-08-06.md",
    title: "Hiring panel — 6 Aug 2026",
    updatedAt: "2026-08-06T15:00:00.000Z",
    tier: 1,
    body:
      "Transcript. Decision taken live, in the room, with no pre-read. Worth noting\n" +
      "against the written-decisions cadence.\n\n## Edges\n" +
      "contradicts:: [[Operating Cadence]]\nfeeds:: [[Clinical Ops Hiring Push]]\n",
  },
  {
    path: "20-areas/team-structure.md",
    title: "Team structure",
    updatedAt: "2026-07-15T09:00:00.000Z",
    tier: 1,
    body:
      "Implementation reports into Ops, not Product. That reporting line is why the\n" +
      "constraint kept getting mislabelled as engineering.\n\n## Edges\n" +
      "causes:: [[Implementation Bottleneck]]\n",
  },
  {
    path: "30-resources/sales-comp-plan.md",
    title: "Sales comp plan",
    updatedAt: "2026-07-02T09:00:00.000Z",
    tier: 1,
    body:
      "New-logo bookings carry the higher accelerator.\n\n## Edges\n" +
      "contradicts:: [[Expansion Over Acquisition]]\n",
  },
  {
    path: "30-resources/onboarding-runbook.md",
    title: "Onboarding runbook",
    updatedAt: "2026-03-11T09:00:00.000Z",
    tier: 0,
    body: "Step-by-step for a new site. Not touched since March.\n",
  },
  {
    path: "insights/constraint-moves-it-does-not-disappear.md",
    title: "The constraint moves, it doesn't disappear",
    updatedAt: "2026-08-10T07:19:00.000Z",
    tier: 2,
    body:
      "derived-from: [[Implementation Bottleneck]], [[Team Structure]], [[2025 Platform Migration]]\n\n" +
      "Engineering was the constraint in 2025 and clinical review is the constraint now.\n" +
      "Both times it sat one step downstream of where the org chart said to look.\n",
  },
  {
    path: "40-archive/2025-platform-migration.md",
    title: "2025 platform migration",
    updatedAt: "2025-11-18T10:00:00.000Z",
    tier: 0,
    body: "Closed out. Kept for the post-mortem only.\n",
  },
];

export const NOTE_REFS: NoteRef[] = SEEDS.map(({ path, title, updatedAt, tier }) => ({
  path,
  title,
  updatedAt,
  tier,
}));

export const NOTES: Note[] = SEEDS.map((seed, i) => ({
  path: seed.path,
  title: seed.title,
  updatedAt: seed.updatedAt,
  tier: seed.tier,
  content: seed.body,
  sha: `a1b2c3${String(i).padStart(2, "0")}`,
  frontmatter: { title: seed.title, tier: seed.tier },
}));

/** Notes past their freshness window — the Home "what's stale" section. */
export const STALE_NOTES: NoteRef[] = NOTE_REFS.filter((n) =>
  [
    "30-resources/contracts/analytics-vendor-contract.md",
    "30-resources/contracts/implementation-sow-template.md",
    "20-areas/operating-cadence.md",
    "40-archive/2025-platform-migration.md",
  ].includes(n.path),
);
