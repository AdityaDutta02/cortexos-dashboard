/**
 * The Home decision queue. Derived by hand here rather than computed, so the
 * copy for each `DecisionItem.kind` can be reviewed as copy.
 */

import type { DecisionItem } from "cortexos-types";

export const DECISIONS: DecisionItem[] = [
  {
    id: "dc_01",
    kind: "contradiction",
    title: "Your pricing policy and your last four enterprise deals disagree",
    detail:
      "The policy says discounts are an approved exception. The deal desk notes say every recent deal closed a band below list. Nothing has picked a winner — that is yours to do.",
  },
  {
    id: "dc_02",
    kind: "contradiction",
    title: "The comp plan rewards exactly what the strategy de-prioritises",
    detail:
      "Expansion-over-acquisition was decided on 3 Aug. The comp plan still puts the higher accelerator on new logos.",
  },
  {
    id: "dc_03",
    kind: "belief_drift",
    title: "“Decisions happen in writing, before the meeting” may no longer hold",
    detail:
      "The last two hiring decisions were made live with no pre-read. Has the cadence changed, or were those exceptions?",
  },
  {
    id: "dc_04",
    kind: "connector_error",
    title: "Your mailbox stopped syncing nine days ago",
    detail:
      "The connector is returning 401. 3,402 items are frozen at their last sync. Re-linking takes about a minute.",
  },
  {
    id: "dc_05",
    kind: "low_confidence",
    title: "14% of the graph is below your confidence gate",
    detail:
      "Those nodes are searchable but excluded from reasoning. Most of them came from one extraction run over the sales folder.",
  },
];
