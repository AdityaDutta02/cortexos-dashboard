"use client";

import { useMemo } from "react";
import type { GraphEdge, GraphNode } from "cortexos-types";
import { RELATION_LEGEND, relationClass, type RelationClass } from "./palette";

const SWATCH: Record<RelationClass, string> = {
  cause: "bg-blue",
  evidence: "bg-ok",
  conflict: "bg-danger",
  supersede: "bg-warn",
  derivation: "bg-blue-light",
  structure: "bg-border-strong",
  reference: "bg-neutral/50",
};

/**
 * Legend and filter in one control.
 *
 * **Filtering is by relation *class*, not by relation name.** The old version
 * carried a literal seven-name list for "structure", so the live vault's other
 * ~55 relation types belonged to no swatch: turning structure off left them on
 * screen, and turning anything else on made them vanish. A class is derived
 * from the relation, so every type has exactly one home no matter how the
 * taxonomy grows.
 *
 * **`mentions` is off by default.** Both of the owner's complaints about the graph
 * were right and they pointed the same way: with only typed edges it "looked
 * pretty and clean but the number of connections was not enough"; with every
 * wikilink drawn "the structure is fucked and it's just noise to look at". The
 * answer is the hierarchy, not the physics — a typed edge is an assertion, a
 * wikilink is a mention, and the default view shows what he actually asserted.
 * Completeness is one click away, and the line below makes sure the click is
 * discoverable rather than a thing you had to already know about.
 */
export function GraphLegend({
  nodes,
  edges,
  hidden,
  onChange,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** Classes currently filtered out of the simulation. */
  hidden: RelationClass[];
  onChange: (next: RelationClass[]) => void;
}) {
  const { present, mentionOnly } = useMemo(() => {
    const seen = new Set<RelationClass>();
    const typed = new Set<string>();
    const mentioned = new Set<string>();
    for (const edge of edges) {
      const cls = relationClass(edge.relation);
      seen.add(cls);
      const bucket = cls === "reference" ? mentioned : typed;
      bucket.add(edge.source);
      bucket.add(edge.target);
    }
    // Nodes that hang alone in the default view but are connected in Obsidian.
    // 342 of them on the live vault: a gap that looks exactly like a bug and
    // is not, which is why it gets a sentence and a button.
    let count = 0;
    for (const node of nodes) {
      if (!typed.has(node.id) && mentioned.has(node.id)) count += 1;
    }
    return { present: seen, mentionOnly: count };
  }, [nodes, edges]);

  const isHidden = (cls: RelationClass) => hidden.includes(cls);
  const toggle = (cls: RelationClass) =>
    onChange(isHidden(cls) ? hidden.filter((c) => c !== cls) : [...hidden, cls]);

  const showMentionsHint = present.has("reference") && isHidden("reference") && mentionOnly > 0;

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        {RELATION_LEGEND.filter(({ cls }) => present.has(cls)).map(({ cls, label }) => {
          const on = !isHidden(cls);
          return (
            <button
              key={cls}
              type="button"
              onClick={() => toggle(cls)}
              aria-pressed={on}
              title={
                cls === "reference"
                  ? "mentions — an untyped [[wikilink]], not a stated relationship. Click to show or hide."
                  : `${label} — click to show or hide`
              }
              className={`flex items-center gap-1.5 border px-1.5 py-0.5 transition-colors ${
                on ? "border-border bg-bg/85" : "border-transparent opacity-40"
              }`}
            >
              <span className={`inline-block h-0.5 w-3 ${SWATCH[cls]}`} aria-hidden />
              <span className="eyebrow text-text-dim">{label}</span>
            </button>
          );
        })}

        {hidden.length > 0 ? (
          <button
            type="button"
            onClick={() => onChange([])}
            className="eyebrow text-blue underline underline-offset-2"
          >
            all
          </button>
        ) : null}

        <span className="mx-1 h-3 w-px bg-border" aria-hidden />

        <NodeKey swatch={<span className="inline-block h-2 w-2 bg-blue" />} label="hot" />
        <NodeKey swatch={<span className="inline-block h-2 w-2 bg-border-strong" />} label="warm" />
        <NodeKey
          swatch={<span className="inline-block h-2 w-2 border border-dashed border-warn" />}
          label="proposed"
        />
        <NodeKey
          swatch={<span className="inline-block h-2 w-2 rounded-full border border-danger" />}
          label="conflict"
        />
        <NodeKey
          swatch={<span className="inline-block h-2 w-2 rounded-full border border-dotted border-warn" />}
          label="stale"
        />
      </div>

      {showMentionsHint ? (
        /*
         * The one sentence this control spends, and it is a correctness
         * signal: without it those nodes read as broken data — which is
         * exactly how they were reported the first time.
         */
        <p className="t-caption bg-bg/85 px-1 text-text-dim">
          {mentionOnly} more notes connect only through mentions —{" "}
          <button
            type="button"
            onClick={() => onChange(hidden.filter((c) => c !== "reference"))}
            className="text-blue underline underline-offset-2"
          >
            show them
          </button>
        </p>
      ) : null}
    </div>
  );
}

function NodeKey({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      {swatch}
      <span className="eyebrow text-text-dim">{label}</span>
    </span>
  );
}
