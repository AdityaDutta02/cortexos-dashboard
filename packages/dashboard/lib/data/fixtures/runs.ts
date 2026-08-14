/**
 * Runs, tasks, routines, headroom and the promotion queue.
 *
 * Every Run carries a TriggerKind — spec §2.4 invariant. Trickle units are
 * populated on the runs that rode a live session, because §2.4 makes their
 * visibility a product promise, not an implementation detail.
 */

import type {
  Headroom,
  PreflightEstimate,
  PromotionQueue,
  Routine,
  Run,
  TaskDef,
} from "cortexos-types";

export const RUNS: Run[] = [
  {
    id: "run_01k9",
    label: "Extract — board pre-read batch",
    skill: "graph-extract",
    taskId: "process_backlog",
    trigger: "dashboard_button",
    status: "succeeded",
    startedAt: "2026-08-10T07:12:00.000Z",
    finishedAt: "2026-08-10T07:19:40.000Z",
    progress: 1,
    model: "sonnet",
    tokens: { input: 184_200, output: 22_400, cacheRead: 96_000 },
    wrote: [
      "30-resources/implementation-bottleneck.md",
      "10-projects/series-b-narrative.md",
      "insights/expansion-over-acquisition.md",
    ],
    outputs: [],
    logs: [
      { ts: "2026-08-10T07:12:00.000Z", level: "info", message: "Pre-flight accepted — 14 items" },
      { ts: "2026-08-10T07:14:22.000Z", level: "info", message: "Extracted 31 edges, 6 below gate" },
      { ts: "2026-08-10T07:19:40.000Z", level: "info", message: "Committed as 1 batch, index rebuilt" },
    ],
    trickleUnits: [],
  },
  {
    id: "run_01k8",
    label: "Morning brief",
    skill: "morning-brief",
    taskId: "morning_brief",
    trigger: "routine",
    status: "succeeded",
    startedAt: "2026-08-10T02:30:00.000Z",
    finishedAt: "2026-08-10T02:31:12.000Z",
    progress: 1,
    model: "haiku",
    tokens: { input: 21_800, output: 3_100 },
    wrote: ["00-maps/brief/2026-08-10.md"],
    outputs: ["out_brief_0810"],
    logs: [
      { ts: "2026-08-10T02:30:00.000Z", level: "info", message: "Prepare stage ran locally at 02:00 — zero Claude" },
      { ts: "2026-08-10T02:31:12.000Z", level: "info", message: "Brief written" },
    ],
    trickleUnits: [],
  },
  {
    id: "run_01k7",
    label: "MCP session — search + graph_neighbors",
    trigger: "trickle",
    status: "succeeded",
    startedAt: "2026-08-09T18:44:00.000Z",
    finishedAt: "2026-08-09T18:44:38.000Z",
    progress: 1,
    model: "haiku",
    tokens: { input: 9_400, output: 1_050 },
    wrote: ["20-areas/pricing-policy.md"],
    outputs: [],
    logs: [
      { ts: "2026-08-09T18:44:02.000Z", level: "info", message: "3 backlog units attached to this call (cap 3)" },
    ],
    trickleUnits: [
      {
        id: "tr_31",
        kind: "confirm_edges",
        description: "Confirmed 3 edges on Pricing Policy",
        target: "20-areas/pricing-policy.md",
        status: "done",
        executedAt: "2026-08-09T18:44:11.000Z",
      },
      {
        id: "tr_32",
        kind: "verify_claim",
        description: "Verified “last four enterprise deals closed below list” against its source chunk",
        target: "30-resources/enterprise-deal-desk-notes.md",
        status: "done",
        executedAt: "2026-08-09T18:44:26.000Z",
      },
      {
        id: "tr_33",
        kind: "promote_file",
        description: "Promoted Implementation SOW template to Warm",
        target: "30-resources/contracts/implementation-sow-template.md",
        status: "failed",
        executedAt: "2026-08-09T18:44:36.000Z",
      },
    ],
  },
  {
    id: "run_01k6",
    label: "Weekly review",
    skill: "weekly-review",
    taskId: "weekly_review",
    trigger: "routine",
    status: "failed",
    startedAt: "2026-08-09T02:30:00.000Z",
    finishedAt: "2026-08-09T02:30:44.000Z",
    model: "sonnet",
    wrote: [],
    outputs: [],
    logs: [
      { ts: "2026-08-09T02:30:44.000Z", level: "error", message: "Calendar connector returned 401 — token refresh needed" },
    ],
    trickleUnits: [],
    error: "Calendar connector unauthorised. Re-link it in Settings → Connectors.",
  },
  {
    id: "run_01k5",
    label: "Extract — vendor contracts",
    skill: "graph-extract",
    taskId: "process_backlog",
    trigger: "chat_command",
    status: "paused",
    startedAt: "2026-08-08T21:02:00.000Z",
    progress: 0.62,
    model: "sonnet",
    tokens: { input: 118_000, output: 14_300 },
    wrote: ["30-resources/contracts/analytics-vendor-contract.md"],
    outputs: [],
    logs: [
      { ts: "2026-08-08T21:05:00.000Z", level: "warn", message: "Memory checkpoint hit — paused, resumable from item 9/14" },
    ],
    trickleUnits: [],
  },
  {
    id: "run_01k4",
    label: "Claude Code session — Stop hook",
    trigger: "claude_code_hook",
    status: "succeeded",
    startedAt: "2026-08-08T15:41:00.000Z",
    finishedAt: "2026-08-08T15:41:19.000Z",
    model: "haiku",
    tokens: { input: 4_200, output: 610 },
    wrote: [],
    outputs: [],
    logs: [{ ts: "2026-08-08T15:41:19.000Z", level: "info", message: "1 backlog unit drained" }],
    trickleUnits: [
      {
        id: "tr_29",
        kind: "harvest_profile_fact",
        description: "Harvested a profile fact: prefers written pre-reads over live walkthroughs",
        target: "00-maps/profile/preferences.md",
        status: "done",
        executedAt: "2026-08-08T15:41:16.000Z",
      },
    ],
  },
];

export const TASKS: TaskDef[] = [
  {
    id: "process_backlog",
    label: "Process backlog",
    description: "Run one bounded extraction batch over the promotion queue.",
    triggers: ["dashboard_button", "chat_command"],
    skill: "graph-extract",
    lastRun: { id: "run_01k9", at: "2026-08-10T07:19:40.000Z", status: "succeeded" },
    enabled: true,
    origin: "template",
  },
  {
    id: "morning_brief",
    label: "Morning brief",
    description: "What changed overnight, what needs you today.",
    triggers: ["routine", "chat_command"],
    skill: "morning-brief",
    lastRun: { id: "run_01k8", at: "2026-08-10T02:31:12.000Z", status: "succeeded" },
    nextRun: "2026-08-11T02:30:00.000Z",
    enabled: true,
    origin: "template",
  },
  {
    id: "weekly_review",
    label: "Weekly review",
    description: "Decisions taken, contradictions opened, beliefs that drifted.",
    triggers: ["routine", "dashboard_button"],
    skill: "weekly-review",
    lastRun: { id: "run_01k6", at: "2026-08-09T02:30:44.000Z", status: "failed" },
    nextRun: "2026-08-16T02:30:00.000Z",
    enabled: true,
    origin: "template",
  },
  {
    id: "audit",
    label: "Graph audit",
    description: "Orphans, dangling edges, low-confidence density, expired stamps.",
    triggers: ["dashboard_button", "chat_command"],
    skill: "audit",
    enabled: true,
    origin: "template",
  },
];

export const ROUTINES: Routine[] = [
  {
    id: "rt_brief",
    prompt: "Every weekday at 8am, ask CORTEX for my morning brief.",
    budget: "1/day",
    enabled: true,
    lastSeenAt: "2026-08-10T02:30:00.000Z",
  },
  {
    id: "rt_weekly",
    prompt: "Every Sunday evening, ask CORTEX for my weekly review.",
    budget: "1/week",
    enabled: true,
    lastSeenAt: "2026-08-09T02:30:00.000Z",
  },
];

export const HEADROOM: Headroom = {
  usedPct: 0.08,
  resetsAt: "2026-08-14T00:00:00.000Z",
  windowTokens: { input: 612_400, output: 71_900, cacheRead: 240_000 },
  plan: "max",
};

export const PROMOTION_QUEUE: PromotionQueue = {
  toWarm: 46,
  toHot: 11,
  next: [
    {
      path: "30-resources/transcripts/board-meeting-2026-07-28.md",
      score: 0.94,
      reason: "Retrieved 7 times this week, still Warm",
    },
    {
      path: "30-resources/enterprise-deal-desk-notes.md",
      score: 0.88,
      reason: "Cited in an open contradiction",
    },
    {
      path: "10-projects/clinical-ops-hiring.md",
      score: 0.81,
      reason: "Linked from two Hot notes",
    },
    {
      path: "30-resources/contracts/analytics-vendor-contract.md",
      score: 0.74,
      reason: "as-of stamp expiring, notice window opens soon",
    },
  ],
};

export const PREFLIGHT: PreflightEstimate = {
  itemCount: 46,
  estimatedTokens: { input: 890_000, output: 96_000, cacheRead: 410_000 },
  estimatedHeadroomPct: 0.12,
  estimatedMinutes: 9,
  // The dl below already carries the numbers; the sentence only has to carry
  // the two things a number cannot: which model, and that stopping is safe.
  summary: "Queued files, on Sonnet. Stoppable — it resumes from the last checkpoint.",
};
