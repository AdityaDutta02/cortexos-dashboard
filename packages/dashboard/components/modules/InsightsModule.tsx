"use client";

import { useMemo } from "react";
import type { GraphEdge, GraphNode, HomeSummary, NoteRef } from "cortexos-types";
import type { PanelTarget } from "@/lib/panel";
import { insightHeadline, selectInsights } from "@/lib/insights";
import { CappedList, Dot, DotBullet, EmptyState, Module } from "@/components/ui";

/**
 * INSIGHTS — his actual Layer-2 insight notes.
 *
 * What this module used to show was five **contradiction** pairs
 * (`Built But Invisible ⇄ Ship One Feature Daily…`) and zero insights, so the
 * label described none of its contents. A contradiction is an open tension
 * awaiting a judgement; an insight is a synthesised node derived from a
 * subgraph. They are different objects with different verbs, and they now have
 * different modules — see `ContradictionsModule`.
 *
 * A row is the insight's headline and a bullet whose colour says how wired-in
 * it is; the count and the stale ring stay in the header. Clicking opens the
 * note by **path**, which the node carries, never by its title-shaped id.
 */
export function InsightsModule({
  nodes,
  edges,
  connected,
  stale,
  resolvePath,
  onOpen,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** The "what the graph connected" digest — one clause each. */
  connected: HomeSummary["connected"];
  stale: NoteRef[];
  /** Title/id → vault path. The digest addresses nodes by id, not by path. */
  resolvePath: (idOrTitle: string) => string | null;
  onOpen: (target: PanelTarget) => void;
}) {
  const insights = useMemo(() => selectInsights(nodes, edges), [nodes, edges]);

  return (
    <Module
      label="Insights"
      value={
        <>
          <span className="t-mono text-text-dim">{insights.length}</span>
          {stale.length > 0 ? (
            <button
              type="button"
              onClick={() => onOpen({ kind: "stale" })}
              title={`${stale.length} notes past their freshness window`}
              className="flex items-center gap-1.5 transition-colors hover:text-warn"
            >
              <Dot tone="warn" size={7} />
              <span className="t-mono text-warn">{stale.length}</span>
            </button>
          ) : null}
        </>
      }
    >
      {insights.length === 0 ? (
        <EmptyState
          title="No insights yet"
          detail="An insight is synthesised from a subgraph, not captured. Run a synthesis pass and they appear here."
        />
      ) : (
        <CappedList count={insights.length} label="insights" testId="insight-lines">
          {insights.map((node) => (
            <li key={node.id}>
              <button
                type="button"
                onClick={() => onOpen({ kind: "note", path: node.path })}
                title={`${node.label} — ${node.degree} connections`}
                className="flex w-full items-start gap-2.5 border-b border-border/50 px-1 py-2.5 text-left transition-colors hover:bg-blue-tint"
              >
                {/* Dimmed below four edges: a synthesis with almost no
                    neighbours has not earned the same weight as one wired
                    through the graph, and that is a property of the node
                    rather than a sentence about it. */}
                <DotBullet tone={node.degree >= 4 ? "blue" : "neutral"} />
                <span className="t-body-sm min-w-0 flex-1 text-text-muted">
                  {insightHeadline(node.label)}
                </span>
                <span className="t-mono shrink-0 pt-0.5 text-text-dim">{node.degree}</span>
              </button>
            </li>
          ))}
        </CappedList>
      )}

      {connected.length > 0 ? (
        <Connected connected={connected} resolvePath={resolvePath} onOpen={onOpen} />
      ) : null}
    </Module>
  );
}

/**
 * The "what the graph connected since last visit" digest.
 *
 * Its `nodes` are **ids** — titles — so a row is only clickable once one of
 * them resolves to a path. Unresolved it stays a line of text: a button that
 * opens NOT FOUND is worse than no button.
 */
function Connected({
  connected,
  resolvePath,
  onOpen,
}: {
  connected: HomeSummary["connected"];
  resolvePath: (idOrTitle: string) => string | null;
  onOpen: (target: PanelTarget) => void;
}) {
  return (
    <section className="mt-3 border-t border-border/60 pt-2">
      <p className="eyebrow mb-1">Newly connected</p>
      <ul className="flex flex-col">
        {connected.map((item, i) => {
          const path = item.nodes.map(resolvePath).find((p): p is string => Boolean(p)) ?? null;
          const inner = (
            <>
              <DotBullet tone="blue" />
              <span className="t-body-sm min-w-0 flex-1 text-text-muted">{item.summary}</span>
            </>
          );
          return (
            <li key={`${item.at}-${i}`}>
              {path ? (
                <button
                  type="button"
                  onClick={() => onOpen({ kind: "note", path })}
                  title={item.nodes.join(" · ")}
                  className="flex w-full items-start gap-2.5 px-1 py-2 text-left transition-colors hover:bg-blue-tint"
                >
                  {inner}
                </button>
              ) : (
                <p className="flex items-start gap-2.5 px-1 py-2" title={item.nodes.join(" · ")}>
                  {inner}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
