/**
 * The profile layer — belief rows at varying confidence, some ungraduated,
 * one superseded, plus the suppression list, the drifts and observed signals.
 * Spec §7.
 */

import type {
  Belief,
  BeliefDrift,
  MonthlyReview,
  ObservedSignals,
  SuppressedBelief,
} from "cortexos-types";

export const BELIEFS: Belief[] = [
  {
    id: "bl_01",
    statement: "Rohan runs Arbor Health, a clinical-operations company selling to hospital groups.",
    origin: "told",
    firstSeen: "2026-03-02T09:00:00.000Z",
    lastConfirmed: "2026-08-01T09:00:00.000Z",
    observationCount: 41,
    distinctDays: 28,
    counterEvidenceCount: 0,
    confidence: 0.99,
    ttlClass: "stable",
    graduated: true,
    category: "identity",
    sources: ["00-maps/profile/onboarding.md"],
  },
  {
    id: "bl_02",
    statement: "Decisions are made in writing before the meeting, not in the meeting.",
    origin: "inferred",
    firstSeen: "2026-04-11T09:00:00.000Z",
    lastConfirmed: "2026-08-03T10:20:00.000Z",
    observationCount: 12,
    distinctDays: 9,
    counterEvidenceCount: 1,
    confidence: 0.87,
    ttlClass: "seasonal",
    graduated: true,
    category: "preferences",
    sources: ["20-areas/operating-cadence.md", "30-resources/transcripts/leadership-2026-08-03.md"],
  },
  {
    id: "bl_03",
    statement: "This quarter's priority is expansion inside existing accounts, not new logos.",
    origin: "inferred",
    firstSeen: "2026-08-03T10:20:00.000Z",
    lastConfirmed: "2026-08-04T06:50:00.000Z",
    observationCount: 3,
    distinctDays: 2,
    counterEvidenceCount: 0,
    confidence: 0.66,
    ttlClass: "volatile",
    graduated: true,
    category: "priorities",
    sources: ["insights/expansion-over-acquisition.md"],
  },
  {
    id: "bl_04",
    statement: "Prefers a one-page written brief over a deck for anything internal.",
    origin: "inferred",
    firstSeen: "2026-07-26T09:00:00.000Z",
    lastConfirmed: "2026-07-31T09:00:00.000Z",
    observationCount: 2,
    distinctDays: 1,
    counterEvidenceCount: 0,
    confidence: 0.38,
    ttlClass: "seasonal",
    graduated: false,
    category: "preferences",
    sources: ["30-resources/transcripts/leadership-2026-08-03.md"],
  },
  {
    id: "bl_05",
    statement: "Treats the analytics vendor renewal as a Q4 problem.",
    origin: "inferred",
    firstSeen: "2026-06-15T09:00:00.000Z",
    lastConfirmed: "2026-06-15T09:00:00.000Z",
    observationCount: 1,
    distinctDays: 1,
    counterEvidenceCount: 2,
    confidence: 0.21,
    ttlClass: "volatile",
    graduated: false,
    category: "priorities",
    sources: ["30-resources/contracts/analytics-vendor-contract.md"],
  },
  {
    id: "bl_06",
    statement: "The implementation constraint is an engineering capacity problem.",
    origin: "inferred",
    firstSeen: "2026-05-04T09:00:00.000Z",
    lastConfirmed: "2026-06-20T09:00:00.000Z",
    observationCount: 6,
    distinctDays: 4,
    counterEvidenceCount: 5,
    confidence: 0.29,
    ttlClass: "seasonal",
    graduated: true,
    supersededBy: "bl_07",
    category: "operating-model",
    sources: ["40-archive/2025-platform-migration.md"],
  },
  {
    id: "bl_07",
    statement: "The implementation constraint is clinical review capacity, not engineering.",
    origin: "inferred",
    firstSeen: "2026-07-28T17:00:00.000Z",
    lastConfirmed: "2026-08-05T14:10:00.000Z",
    observationCount: 8,
    distinctDays: 5,
    counterEvidenceCount: 0,
    confidence: 0.93,
    ttlClass: "seasonal",
    graduated: true,
    category: "operating-model",
    sources: [
      "30-resources/implementation-bottleneck.md",
      "30-resources/transcripts/board-meeting-2026-07-28.md",
    ],
  },
];

export const SUPPRESSED: SuppressedBelief[] = [
  {
    id: "sp_01",
    statement: "Is comfortable being pulled into customer escalations directly.",
    suppressedAt: "2026-06-02T09:00:00.000Z",
    note: "Was true once, during the pilot. Never re-infer it.",
  },
  {
    id: "sp_02",
    statement: "Reads email in the evening.",
    suppressedAt: "2026-05-19T09:00:00.000Z",
  },
];

export const DRIFTS: BeliefDrift[] = [
  {
    beliefId: "bl_02",
    statement: "Decisions are made in writing before the meeting, not in the meeting.",
    observedInstead: "The last two hiring decisions were made live, with no pre-read.",
    detectedAt: "2026-08-09T11:00:00.000Z",
    prompt: "Has the cadence changed, or were those two exceptions?",
  },
  {
    beliefId: "bl_05",
    statement: "Treats the analytics vendor renewal as a Q4 problem.",
    observedInstead: "You have opened the contract note three times in the last week.",
    detectedAt: "2026-08-08T09:30:00.000Z",
    prompt: "Move that to this quarter?",
  },
];

export const OBSERVED_SIGNALS: ObservedSignals = {
  workingHours: { start: "08:15", end: "19:40", timezone: "Asia/Kolkata" },
  unreachableWindows: [
    { from: "13:00", to: "13:45", label: "Blocked daily" },
    { from: "Fri 15:00", to: "Fri 18:00", label: "Customer calls" },
  ],
  skillUsage: [
    { skill: "morning-brief", count: 41, lastUsed: "2026-08-10T02:31:12.000Z" },
    { skill: "graph-extract", count: 18, lastUsed: "2026-08-10T07:19:40.000Z" },
    { skill: "weekly-review", count: 11, lastUsed: "2026-08-09T02:30:44.000Z" },
    { skill: "board-pack", count: 3, lastUsed: "2026-07-27T18:00:00.000Z" },
  ],
  frequentDocuments: [
    { path: "30-resources/implementation-bottleneck.md", count: 31 },
    { path: "10-projects/series-b-narrative.md", count: 23 },
    { path: "20-areas/pricing-policy.md", count: 18 },
  ],
  heavilyEditedSkills: [
    { skill: "weekly-review", editRatio: 0.62 },
    { skill: "board-pack", editRatio: 0.44 },
  ],
  repeatedQuestions: [
    { question: "Which accounts are waiting on clinical review right now?", count: 7 },
    { question: "What did we promise the board about hiring?", count: 4 },
  ],
};

export const MONTHLY_REVIEW: MonthlyReview = {
  generatedAt: "2026-08-01T06:00:00.000Z",
  questions: [
    { beliefId: "bl_04", question: "Brief or deck for internal updates — which do you actually want?" },
    { beliefId: "bl_05", question: "Is the analytics renewal still a Q4 item?" },
    { beliefId: "bl_03", question: "Is expansion-over-new-logo a quarter, or the year?" },
  ],
};
