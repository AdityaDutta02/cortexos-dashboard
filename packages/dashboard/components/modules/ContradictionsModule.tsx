"use client";

import type { Contradiction } from "cortexos-types";
import type { PanelTarget } from "@/lib/panel";
import { insightHeadline } from "@/lib/insights";
import { CappedList, DotBullet, Module } from "@/components/ui";

/**
 * CONTRADICTIONS — the open tensions, under their own name.
 *
 * Spec §6 requires these to be surfaced and requires CORTEX never to pick a
 * winner, so they keep a module. What they must not do is impersonate an
 * insight: they were the entire contents of the INSIGHTS rail, which meant the
 * one label on screen described the one thing it was not showing.
 *
 * A row is the two node titles and a red bullet. The graph is already pulsing
 * red on the same two nodes — this carries the pair, and the panel carries the
 * two claims.
 */
/**
 * Four rows, then the panel.
 *
 * Not an arbitrary number — a bound. Rendering all of them made this module
 * 380px of a 832px rail and squeezed INSIGHTS to a 26px slit with 2,397px of
 * content inside it. A rail module states its situation; the list is the
 * panel's job.
 */
const VISIBLE = 3;

export function ContradictionsModule({
  contradictions,
  onOpen,
}: {
  contradictions: Contradiction[];
  onOpen: (target: PanelTarget) => void;
}) {
  const all = contradictions.filter((c) => c.status === "open");
  const open = all.slice(0, VISIBLE);
  const hidden = all.length - open.length;

  return (
    <Module
      label="Contradictions"
      value={
        all.length > 0 ? (
          <button
            type="button"
            onClick={() => onOpen({ kind: "contradictions" })}
            title="Open all of them"
            className="t-mono text-danger transition-colors hover:underline"
          >
            {all.length}
          </button>
        ) : (
          <span className="t-mono text-text-dim">0</span>
        )
      }
    >
      {open.length === 0 ? (
        // Empty states draw nothing: one quiet line, no frame, no dashes.
        <p className="t-body px-1 py-2 text-text-muted">Nothing in the graph disagrees.</p>
      ) : (
        <CappedList count={open.length} label="contradictions" testId="contradiction-list">
          {open.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onOpen({ kind: "contradiction", id: c.id })}
                title={`${c.nodeA} ⇄ ${c.nodeB}`}
                className="flex w-full items-start gap-2.5 border-b border-border/50 px-1 py-2 text-left transition-colors hover:bg-blue-tint"
              >
                <DotBullet tone="danger" />
                {/* One line, truncated. Two long vault titles wrap to three
                    lines each in a 300px rail, which is how this module grew
                    to 352px and squeezed the one above it. The full pair is in
                    the tooltip and in the panel. */}
                <span className="t-body-sm min-w-0 flex-1 truncate text-text-muted">
                  {insightHeadline(c.nodeA)} ⇄ {insightHeadline(c.nodeB)}
                </span>
              </button>
            </li>
          ))}
          {hidden > 0 ? (
            <li>
              <button
                type="button"
                onClick={() => onOpen({ kind: "contradictions" })}
                className="t-caption w-full px-1 py-2 text-left text-text-dim transition-colors hover:text-blue"
              >
                {hidden} more
              </button>
            </li>
          ) : null}
        </CappedList>
      )}
    </Module>
  );
}
