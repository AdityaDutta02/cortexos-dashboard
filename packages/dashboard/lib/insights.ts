import type { GraphEdge, GraphNode } from "cortexos-types";

/**
 * What an Insight actually is, and what it is not.
 *
 * **Insight = a Layer-2 synthesised node.** Derived from a subgraph, carrying
 * `derived-from:`, living in the vault's insights folder. Regenerable when its
 * input edges change, and fed back into the graph with its own edges.
 *
 * **A contradiction is not an insight.** It is an open tension from the
 * Contradiction Register (spec §6) — two nodes that disagree, awaiting a human
 * judgement. The INSIGHTS module used to list five contradiction pairs and
 * zero insights, so its label described none of its contents (found live,
 * 2026-08-11). The two are surfaced separately now.
 *
 * ## Why the folder, and not `derived-from`
 *
 * Both signals are used, folder first. On the live 1,292-note vault there are
 * **46 notes in `Insights/` and exactly one `derived-from` edge in the whole
 * graph** — the convention is the folder; the edge is aspirational. Detecting
 * on `derived-from` alone would report zero insights, which is the same
 * failure in the opposite direction.
 *
 * The folder name is matched semantically (`insights`, case-folded, singular
 * or plural) rather than hardcoded to one vault's spelling. The agent knows
 * the real answer — `GET /api/vault/profile` returns `folders.insights` — but
 * `DataSource` has no method for it; see the report.
 */

/** True when the note's top-level folder is the vault's insights folder. */
export function isInsightPath(path: string): boolean {
  const [top] = path.split("/");
  return /^insights?$/i.test(top ?? "");
}

/**
 * The insight nodes, richest first.
 *
 * Degree is the ranking because an insight's whole value is the edges it
 * carries: a synthesised node wired into twelve neighbours has earned more of
 * the rail than one wired into two. Ties break on recency.
 */
export function selectInsights(nodes: GraphNode[], edges: GraphEdge[]): GraphNode[] {
  const derived = new Set<string>();
  for (const edge of edges) {
    if (edge.relation === "derived-from") derived.add(edge.source);
  }
  return nodes
    .filter((node) => isInsightPath(node.path) || derived.has(node.id))
    .sort((a, b) => b.degree - a.degree || b.updatedAt.localeCompare(a.updatedAt));
}

/**
 * A vault title, made readable in a 300px rail.
 *
 * Real titles are `"💡 Forge Is Directing AI Like A Team — Literally"`: the
 * emoji is decoration the folder already encodes, and the em-dash clause is a
 * second sentence. Both are dropped for the row and kept in the tooltip, so
 * nothing is hidden — only deferred.
 *
 * It also accepts a path, because the values it is handed are node ids and a
 * node id is a title on the live agent but a path on older data. Rendering
 * `20-areas/pricing-policy.md ⇄ 30-resources/sales-comp-plan.md` in a rail is
 * a worse answer than the basename, and guessing wrong either way is harmless
 * — this is a label, never something passed to `readNote`.
 */
export function insightHeadline(label: string): string {
  const base = /\.md$/i.test(label) ? (label.split("/").pop() ?? label).slice(0, -3) : label;
  const withoutEmoji = base.replace(/^[^\p{L}\p{N}]+/u, "").trim();
  const [head] = withoutEmoji.split(/\s+—\s+/);
  return (head ?? withoutEmoji).trim() || label;
}
