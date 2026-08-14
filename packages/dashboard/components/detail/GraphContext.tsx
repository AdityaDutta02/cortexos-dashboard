"use client";

import { useMemo } from "react";
import type { GraphEdge, GraphNode } from "cortexos-types";
import type { RelationClass } from "@/components/graph/palette";
import { GraphSurface, type NodeFlags } from "@/components/graph/GraphSurface";
import { GraphLegend } from "@/components/graph/GraphLegend";
import { Dot } from "@/components/ui";

/**
 * The left half of View B: the graph, zoomed to whatever the side panel is
 * showing, over the list of nodes that touch it.
 *
 * When the panel is showing something that is not a node (a connector, the
 * settings tab), `focus` is null and the full graph stays on screen — the user
 * never loses the map just because they opened a detail.
 */
export function GraphContext({
  nodes,
  edges,
  flags,
  focus,
  hiddenClasses,
  onHiddenChange,
  onSelect,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  flags: NodeFlags;
  focus: string | null;
  hiddenClasses: RelationClass[];
  onHiddenChange: (next: RelationClass[]) => void;
  /** `focus` is a node **id** — that is what edges reference. */
  onSelect: (node: { id: string; path: string }) => void;
}) {
  const local = useMemo(() => {
    if (!focus) return { nodes, edges, clipped: 0 };
    const keep = new Set<string>([focus]);
    for (const e of edges) {
      if (e.source === focus) keep.add(e.target);
      if (e.target === focus) keep.add(e.source);
    }
    const kept = nodes.filter((n) => keep.has(n.id));
    return {
      nodes: kept,
      edges: edges.filter((e) => keep.has(e.source) && keep.has(e.target)),
      /**
       * Neighbours this node has an edge to that are **not in the payload** —
       * they were cut by `getGraph`'s node limit, so their edges arrived and
       * they did not. Drawing the remainder without saying so is the exact
       * "correct-looking output over incomplete input" shape this build keeps
       * hitting, and it is indistinguishable from a node that really does have
       * two neighbours. It is a correctness signal, so it gets words.
       */
      clipped: keep.size - kept.length,
    };
  }, [focus, nodes, edges]);

  const neighbours = useMemo(() => {
    if (!focus) return [];
    const byId = new Map(nodes.map((n) => [n.id, n]));
    return edges
      .filter((e) => e.source === focus || e.target === focus)
      .map((e) => ({
        relation: e.relation,
        outgoing: e.source === focus,
        node: byId.get(e.source === focus ? e.target : e.source),
        proposed: e.proposed,
        confidence: e.provenance?.confidence,
      }))
      .filter((n): n is typeof n & { node: GraphNode } => Boolean(n.node));
  }, [focus, nodes, edges]);

  return (
    /*
      Flex, not a two-row grid. The grid gave the neighbour list a fixed ~1fr
      of the column whether it held two rows or forty, which is where the dead
      band under a short list came from. Now the graph takes everything left
      over and the list is exactly its own height, capped at 45% so a hub node
      with sixty edges cannot swallow the map.
    */
    <div className="flex min-h-0 flex-col gap-2">
      {local.clipped > 0 ? (
        <div
          role="status"
          data-testid="neighbourhood-clipped-notice"
          className="t-body-sm shrink-0 border border-warn/50 bg-warn-tint px-3 py-2 text-text"
        >
          {local.clipped} of this note&rsquo;s {local.clipped + local.nodes.length - 1} connected
          notes {local.clipped === 1 ? "is" : "are"} missing from the loaded graph — cut by its
          node limit. What is drawn below is real; the rest is not drawn.
        </div>
      ) : null}
      <div className="relative min-h-0 flex-1 border border-border bg-bg">
        <GraphSurface
          nodes={local.nodes}
          edges={local.edges}
          flags={flags}
          selected={focus}
          hiddenClasses={hiddenClasses}
          onSelect={onSelect}
        />
        <div className="pointer-events-none absolute right-2.5 bottom-2.5 left-2.5">
          <div className="pointer-events-auto inline-block">
            <GraphLegend
              nodes={local.nodes}
              edges={local.edges}
              hidden={hiddenClasses}
              onChange={onHiddenChange}
            />
          </div>
        </div>
      </div>

      {focus && neighbours.length > 0 ? (
        <div className="scroll-region max-h-[45%] shrink-0 border border-border bg-bg">
          <ul data-testid="neighbour-list">
            {neighbours.map((n, i) => (
              <li key={`${n.node.id}-${i}`}>
                <button
                  type="button"
                  onClick={() => onSelect({ id: n.node.id, path: n.node.path })}
                  className="flex w-full items-center gap-3 border-b border-border/50 px-3 py-2.5 text-left transition-colors hover:bg-blue-tint"
                >
                  <span aria-hidden className="t-mono w-3 shrink-0 text-text-dim">
                    {n.outgoing ? "→" : "←"}
                  </span>
                  <span
                    className={`eyebrow w-[118px] shrink-0 truncate ${
                      n.relation === "contradicts" ? "text-danger" : "text-blue"
                    }`}
                  >
                    {n.relation}
                  </span>
                  <span className="t-body min-w-0 flex-1 truncate text-text">{n.node.label}</span>
                  {n.proposed ? (
                    <span
                      title={`confidence ${n.confidence?.toFixed(2) ?? "?"} — below the gate, excluded from reasoning`}
                    >
                      <Dot tone="warn" size={7} />
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
