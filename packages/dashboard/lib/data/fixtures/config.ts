/**
 * `cortex.yaml` as the dashboard sees it. Note `auth: "subscription"` and
 * `opus: "user-invoked-only"` — both are hard product rules, not defaults.
 */

import type { CortexConfig } from "cortexos-types";

export const CONFIG: CortexConfig = {
  version: 2,
  owner: { name: "Rohan Mehta", timezone: "Asia/Kolkata" },
  claude: {
    auth: "subscription",
    models: { attended: "sonnet", light: "haiku", opus: "user-invoked-only" },
  },
  processing: {
    local_only: ["convert", "embed", "cluster", "index", "graph"],
    backlog: { mode: "on_demand", chunk_minutes: 10, preflight_estimate: true },
    trickle: { enabled: true, max_units_per_call: 3, show_in_run_log: true },
  },
  routines: [
    { id: "rt_brief", prompt: "Every weekday at 8am, ask CORTEX for my morning brief.", budget: "1/day" },
    { id: "rt_weekly", prompt: "Every Sunday evening, ask CORTEX for my weekly review.", budget: "1/week" },
  ],
  ingest: {
    keep_all: true,
    sources: [
      { type: "upload" },
      { type: "gdrive", folders: ["Leadership", "Board"], sync: "incremental" },
      { type: "email", sync: "incremental" },
      { type: "drop_bridge", address: "drop@arbor.cortex.local" },
    ],
  },
  graph: { confidence_gate: 0.6, verify: "adversarial", cite_on_retrieval: true },
  profile: {
    graduation: { min_observations: 3, min_distinct_days: 2 },
    demote_after_contradictions: 3,
    monthly_review: true,
  },
  serviceability: {
    beacon: { enabled: true, url: "https://beacon.cortex.example/ingest" },
    self_heal: true,
    template_version: "2.1.0",
  },
  brand: {
    deck_template: "brand/arbor-deck.pptx",
    report_reference: "brand/arbor-report.pdf",
    fonts: ["Space Grotesk", "DM Sans"],
    colors: { primary: "#0562ef", ink: "#0b1015" },
  },
  skills: { enabled: ["morning-brief", "weekly-review", "graph-extract", "board-pack", "audit"] },
  connectors: [
    { id: "cal", label: "Calendar", server: "mcp://calendar", enabled: true },
    { id: "mail", label: "Mailbox", server: "mcp://email", enabled: true },
    { id: "drive", label: "Google Drive", server: "mcp://gdrive", enabled: true },
  ],
  extensions: [],
};
