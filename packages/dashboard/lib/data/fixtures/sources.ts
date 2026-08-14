/**
 * Ingest sources, in-flight items, outputs and the system health verdict.
 * `tokenExpiresInDays` is deliberately inside the 14-day banner window so the
 * re-auth banner (spec §11) is visible on first load.
 */

import type {
  ClientReport,
  ConnectorInfo,
  IngestItem,
  IngestProgress,
  IngestSource,
  OutputArtifact,
  SkillInfo,
  SystemHealth,
} from "cortexos-types";

/**
 * Skills that exist **on disk**, across every place skills actually live.
 *
 * Still not the five names `cortex.yaml` lists — that is the wish list whose
 * phantom entries this fixture exists to stop the UI reproducing offline. What
 * changed on 2026-08-11 is the *shape*: a real machine has skills in the repo,
 * in the adopted vault, and in `~/.claude/skills/`, and only some of them are
 * ones CORTEX can invoke. The mock carries one of each so the offline UI
 * exercises `source` and `invocable` rather than only the happy row.
 */
export const SKILLS: SkillInfo[] = [
  {
    name: "meeting-to-actions",
    description:
      "Turn a meeting transcript or set of notes into decisions, owners and dates, with a citation on every line.",
    path: ".claude/skills/meeting-to-actions",
    enabled: true,
    source: "repo",
    invocable: true,
  },
  {
    name: "graph-engine",
    description:
      "Batched graph operations — synthesis, ingest, health sweeps — as capped multi-agent workflows.",
    path: "vault/.claude/skills/graph-engine",
    enabled: false,
    source: "vault",
    invocable: true,
  },
  {
    name: "linkedin-voice",
    description:
      "The voice spec, corpus and fidelity gate used when drafting a post. Lives in your own Claude.",
    path: "~/.claude/skills/linkedin-voice",
    enabled: false,
    source: "user",
    // Visible to you in every Claude session; CORTEX has no way to call it.
    invocable: false,
  },
];

/**
 * Connectors, from wherever they are configured.
 *
 * This used to be `[]` on the grounds that `cortex.yaml` has `connectors: []`,
 * which was true and beside the point: the user's MCP servers live in
 * `~/.claude.json` and Claude Desktop's config, and there were fourteen of
 * them against the zero on screen. The mix here is the one the UI has to
 * render honestly — one CORTEX owns and can call, two that are the user's and
 * that CORTEX can only see.
 *
 * Still nothing synthesised: a connector never contacted reports
 * `unconfigured`, never `ok`.
 */
export const CONNECTORS: ConnectorInfo[] = [
  {
    id: "mcp_cortex",
    label: "CORTEX",
    health: "ok",
    source: "config",
    reachableByCortex: true,
    lastCheckedAt: "2026-08-11T08:40:00.000Z",
  },
  {
    id: "mcp_context7",
    label: "context7",
    health: "ok",
    source: "user",
    reachableByCortex: false,
    lastCheckedAt: "2026-08-11T08:12:00.000Z",
  },
  {
    id: "mcp_filesystem",
    label: "filesystem",
    health: "unconfigured",
    source: "claude_desktop",
    reachableByCortex: false,
  },
];

/** The upload size cap the agent enforces, mirrored so the mock refuses alike. */
export const MAX_UPLOAD_BYTES = 500 * 1024 * 1024;

export const SOURCES: IngestSource[] = [
  {
    id: "src_upload",
    kind: "upload",
    label: "Direct upload",
    health: "ok",
    lastSyncAt: "2026-08-10T07:02:00.000Z",
    itemCount: 214,
    config: {},
  },
  {
    id: "src_drive",
    kind: "gdrive",
    label: "Google Drive — Leadership",
    health: "degraded",
    lastSyncAt: "2026-08-09T22:10:00.000Z",
    itemCount: 1_186,
    error: "Rate limited by Drive; backing off. 38 files still queued.",
    config: { folders: ["Leadership", "Board"], sync: "incremental" },
  },
  {
    id: "src_email",
    kind: "email",
    label: "Mailbox — rohan@",
    health: "failing",
    lastSyncAt: "2026-08-09T02:30:00.000Z",
    itemCount: 3_402,
    error: "OAuth token rejected (401). Re-link in Settings → Connectors.",
    config: { sync: "incremental" },
  },
  {
    id: "src_drop",
    kind: "drop_bridge",
    label: "Drop bridge",
    health: "ok",
    lastSyncAt: "2026-08-10T06:40:00.000Z",
    itemCount: 57,
    config: { address: "drop@arbor.cortex.local" },
  },
  {
    id: "src_folder",
    kind: "folder",
    label: "Watched folder — /transcripts",
    health: "unconfigured",
    itemCount: 0,
    config: { path: "/transcripts" },
  },
];

export const INGEST_PROGRESS: IngestProgress = {
  byStage: {
    convert: { done: 4_812, total: 4_859 },
    group: { done: 4_780, total: 4_859 },
    embed: { done: 4_612, total: 4_859 },
    rank: { done: 4_612, total: 4_859 },
    extract: { done: 1_284, total: 4_859 },
    verify: { done: 903, total: 1_284 },
  },
  activeItem: "30-resources/transcripts/board-meeting-2026-07-28.md",
  backpressure: false,
};

export const INGEST_ITEMS: IngestItem[] = [
  {
    id: "ing_01",
    sourceId: "src_drive",
    filename: "Board pre-read — Jul 2026.pdf",
    vaultPath: "30-resources/board/board-pre-read-2026-07.md",
    bytes: 1_942_000,
    mime: "application/pdf",
    stage: "extract",
    status: "done",
    receivedAt: "2026-08-09T21:04:00.000Z",
    completedAt: "2026-08-10T07:16:00.000Z",
  },
  {
    id: "ing_02",
    sourceId: "src_upload",
    filename: "Leadership sync 03-08.m4a",
    vaultPath: "30-resources/transcripts/leadership-2026-08-03.md",
    bytes: 48_300_000,
    mime: "audio/mp4",
    stage: "convert",
    status: "processing",
    receivedAt: "2026-08-10T06:58:00.000Z",
  },
  {
    id: "ing_03",
    sourceId: "src_drive",
    filename: "Pricing policy v4.docx",
    vaultPath: "20-areas/pricing-policy.md",
    bytes: 86_400,
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    stage: "group",
    status: "done",
    clusterId: "cl_pricing",
    clusterRepresentative: true,
    receivedAt: "2026-08-06T08:10:00.000Z",
    completedAt: "2026-08-06T08:15:00.000Z",
  },
  {
    id: "ing_04",
    sourceId: "src_drive",
    filename: "Pricing policy v3 (final) FINAL.docx",
    bytes: 84_900,
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    stage: "group",
    status: "skipped",
    clusterId: "cl_pricing",
    clusterRepresentative: false,
    receivedAt: "2026-08-06T08:10:00.000Z",
    completedAt: "2026-08-06T08:11:00.000Z",
  },
  {
    id: "ing_05",
    sourceId: "src_email",
    filename: "RE: analytics renewal",
    bytes: 12_400,
    mime: "message/rfc822",
    stage: "convert",
    status: "failed",
    error: "Mailbox unauthorised — 401 from the connector.",
    receivedAt: "2026-08-09T02:30:00.000Z",
  },
];

export const OUTPUTS: OutputArtifact[] = [
  {
    id: "out_brief_0810",
    filename: "Morning brief — 10 Aug 2026.pdf",
    path: "outputs/briefs/2026-08-10.pdf",
    mime: "application/pdf",
    bytes: 184_000,
    createdAt: "2026-08-10T02:31:12.000Z",
    runId: "run_01k8",
    skill: "morning-brief",
    downloadUrl: "#",
  },
  {
    id: "out_board_0727",
    filename: "Board pack — Jul 2026.pptx",
    path: "outputs/board/2026-07.pptx",
    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    bytes: 6_240_000,
    createdAt: "2026-07-27T18:02:00.000Z",
    runId: "run_01j2",
    skill: "board-pack",
    downloadUrl: "#",
  },
];

export const HEALTH: SystemHealth = {
  status: "amber",
  issues: [
    {
      severity: "error",
      message: "Mailbox connector is unauthorised — 3,402 items are not syncing.",
      action: "Re-link mailbox",
    },
    {
      severity: "warn",
      message: "Your Claude sign-in expires in 11 days.",
      action: "Re-authorise",
    },
    {
      severity: "warn",
      message: "Google Drive is rate limited; 38 files are waiting.",
    },
    {
      severity: "info",
      message: "Index rebuilt 40 minutes ago. Search is current.",
    },
  ],
  tokenExpiresInDays: 11,
  // Bytes are authoritative; the percentage is decoration. 63% of 512GB leaves
  // 189GB free, which is why this fixture's health is amber for the mailbox,
  // never for disk.
  diskPct: 0.63,
  diskFreeBytes: 189_000_000_000,
  diskTotalBytes: 512_000_000_000,
  diskPath: "/",
  indexBuiltAt: "2026-08-10T07:20:00.000Z",
};

/**
 * Two reports for offline dev and /styleguide.
 *
 * Deliberately uneven: the first carries every optional section, the second
 * carries none of them. That second case is the one the screen must handle
 * without inventing anything, so it belongs in the fixtures rather than only
 * in a unit test.
 */
export const CLIENT_CHANNELS: ClientReport[] = [
  {
    id: "motilal-oswal",
    client: "Motilal Oswal",
    isClient: true,
    reportTitle: "Motilal Oswal — Breakout",
    agency: "Example Agency",
    platform: "YouTube",
    range: "Apr 15 → Aug 6, 2026",
    generatedAt: "2026-08-14",
    sourceNotes: ["30 Resources/Proof/Breakout with Motilal Oswal - Performance.md"],
    hero: { label: "Total views · 114 days", value: "1,134,019" },
    headline: {
      lead: "One video drove ",
      accent: "29.1% of all organic subscriber growth",
      tail: " — the channel runs on outliers, not averages.",
    },
    trend: [
      { label: "Apr", value: 42639 },
      { label: "May", value: 715328 },
      { label: "Jun", value: 135556 },
      { label: "Jul", value: 188595 },
    ],
    metrics: [
      { label: "Net subscribers", value: "+12,586", strong: true },
      { label: "Watch time", value: "34,256 h" },
      { label: "Impressions CTR", value: "5.75%" },
    ],
    powerLaw: {
      caption: "Share of organic subscriber growth, by video rank",
      bands: [
        { label: "#1", share: 29.1, caption: "29.1%", tone: "primary" },
        { label: "#2–3", share: 26.2, caption: "26.2%", tone: "soft" },
        { label: "#4–10", share: 20.5, caption: "20.5%", tone: "pale" },
        { label: "Other 279", share: 24.2, caption: "24.2%", tone: "rest" },
      ],
      videos: [
        { rank: "01", title: "How to Identify the Next Big Move", views: "94,869", ctr: "5.03%", subs: "3,152" },
      ],
      videoCount: 331,
    },
    findings: [
      {
        figure: "75.8%",
        figureCaption: "of subs, top 10 videos",
        title: "A handful of videos do almost all the work",
        body: "Top 1 = 29.1%, top 3 = 55.3%, top 10 = 75.8% of organic subscriber growth.",
      },
    ],
    source: "YouTube Studio Advanced Mode export",
  },
  {
    id: "figr-design",
    client: "Figr Design",
    isClient: true,
    reportTitle: "Figr Design — Figrd",
    generatedAt: "2026-07-06",
    sourceNotes: ["30 Resources/Proof/Figrd - Performance.md"],
    metrics: [{ label: "Views", value: "40,286" }],
    findings: [
      { title: "No power-law winner", body: "Top video is only 4.6% of total views." },
    ],
  },
];
