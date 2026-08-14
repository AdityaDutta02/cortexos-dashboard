/**
 * Graph, audit and contradictions — plus the synthetic padding that makes
 * `?nodes=600` an honest frame-rate harness.
 */

import type {
  Contradiction,
  DataSource,
  GraphAudit,
  GraphEdge,
  GraphNeighborhood,
  GraphNode,
  GraphQuery,
  RelationType,
} from "cortexos-types";

import { AUDIT, CONTRADICTIONS, GRAPH_EDGES, GRAPH_NODES } from "../fixtures/graph";
import { settle, syntheticNodeCount } from "./options";

/**
 * Deterministic filler nodes and edges. Each one attaches to earlier nodes so
 * the result has realistic degree spread rather than a uniform mesh.
 *
 * **The typed:untyped ratio is the point.** The real vault has 233 notes with
 * an `## Edges` section and 316 with wikilinks and none, so `references` edges
 * outnumber typed ones roughly 3:2. Two typed and three `references` per
 * synthetic node reproduces that, which is what makes `?nodes=600` an honest
 * frame-rate harness (~600 nodes / ~2.9k edges) rather than a measurement of a
 * graph half the density of the one that ships.
 */
export function padGraph(nodes: GraphNode[], edges: GraphEdge[], target: number) {
  if (target <= nodes.length) return { nodes, edges };
  const outNodes = [...nodes];
  const outEdges = [...edges];
  const relations: RelationType[] = ["mentions", "part-of", "depends-on", "causes", "proves"];
  const rel = (i: number): RelationType => relations[i % relations.length] ?? "mentions";
  for (let i = nodes.length; i < target; i += 1) {
    const id = `synthetic/node-${i}.md`;
    outNodes.push({
      id,
      label: `Node ${i}`,
      path: id,
      tier: (i % 7 === 0 ? 2 : i % 3 === 0 ? 1 : 0) as GraphNode["tier"],
      degree: 1 + (i % 5),
      retrievalCount: i % 11,
      updatedAt: "2026-07-01T00:00:00.000Z",
      proposed: i % 13 === 0,
    });
    const a = outNodes[i % nodes.length];
    const b = outNodes[Math.floor(i / 2) % outNodes.length];
    if (a) outEdges.push({ source: id, relation: rel(i), target: a.id, proposed: false });
    if (b && b.id !== id) {
      outEdges.push({ source: b.id, relation: rel(i + 2), target: id, proposed: i % 9 === 0 });
    }
    // Untyped wikilinks. Hashed offsets rather than neighbours, because a
    // mention is as likely to cross the vault as to stay local — that is what
    // makes hubs gain degree and what the layout has to survive.
    for (let k = 1; k <= 3; k += 1) {
      const other = outNodes[(i * 7 + k * 149) % outNodes.length];
      if (other && other.id !== id) {
        outEdges.push({ source: id, relation: "references", target: other.id, proposed: false });
      }
    }
  }
  return { nodes: outNodes, edges: outEdges };
}

export const graphMock: Pick<
  DataSource,
  "getGraph" | "getAudit" | "listContradictions" | "correctNode"
> = {
  async getGraph(query: GraphQuery): Promise<GraphNeighborhood> {
    return settle("graph", () => {
      const padded = padGraph(GRAPH_NODES, GRAPH_EDGES, syntheticNodeCount());
      const nodes = query.confirmedOnly ? padded.nodes.filter((n) => !n.proposed) : padded.nodes;
      const edges = padded.edges.filter(
        (e) =>
          (!query.relations?.length || query.relations.includes(e.relation)) &&
          (!query.confirmedOnly || !e.proposed),
      );
      const limit = query.limit ?? nodes.length;
      const kept = nodes.slice(0, limit);
      // Culling nodes must cull their edges too, or the caller receives
      // dangling references. `GraphAudit.danglingEdges` is the only place a
      // dangling edge is a legitimate payload.
      const keptIds = new Set(kept.map((n) => n.id));
      return {
        center: query.node ?? kept[0]?.id ?? "",
        nodes: kept,
        edges: edges.filter((e) => keptIds.has(e.source) && keptIds.has(e.target)),
        truncated: nodes.length > limit,
      };
    });
  },

  async getAudit(): Promise<GraphAudit> {
    return settle("graph", AUDIT);
  },

  async listContradictions(): Promise<Contradiction[]> {
    return settle("graph", CONTRADICTIONS);
  },

  async correctNode(node: string, whatIsWrong: string): Promise<{ queuedSiblings: string[] }> {
    void whatIsWrong;
    return settle("graph", () => ({
      queuedSiblings: GRAPH_EDGES.filter((e) => e.source === node || e.target === node)
        .map((e) => (e.source === node ? e.target : e.source))
        .slice(0, 4),
    }));
  },
};
