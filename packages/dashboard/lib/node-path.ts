"use client";

import { useMemo } from "react";
import type { GraphNode } from "cortexos-types";
import { useNoteIndex } from "@/lib/note-index";

/**
 * THE ONE PLACE A TITLE BECOMES A PATH.
 *
 * The trap this exists to close: `GraphNode.id`, `GraphEdge.source`/`target`,
 * `Contradiction.nodeA`/`nodeB`, `HomeSummary.connected[].nodes` and every
 * `[[Wikilink]]` are **titles** — `nodeIds: basename`, because that is how
 * Obsidian resolves links. `readNote` takes a **vault-relative path** and
 * nothing else. Handing it a title produces `not found` for a note that plainly
 * exists, which is exactly what "NOT FOUND — no note at Forge Is Directing AI
 * Like A Team" was (found live twice: 2026-08-10 and 2026-08-11).
 *
 * So: graph internals stay on ids, and every crossing of the boundary goes
 * through `resolve()`. A caller that cannot resolve a title must render it as
 * text — never as a button that will 404.
 */
export interface NodePathResolver {
  /** Title/id → vault path, or null when genuinely nothing answers. */
  resolve(idOrTitle: string): string | null;
  /**
   * False until the note index has loaded. Callers that mark a link "dangling"
   * must wait for this: guessing early calls a real note missing.
   */
  ready: boolean;
}

function fold(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Note index first (all 1,292 notes), graph second (only notes with an edge).
 * The order matters: the graph alone resolved 2 of 31 links in one real note.
 */
export function useNodePathResolver(nodes: GraphNode[]): NodePathResolver {
  const notes = useNoteIndex();

  const byId = useMemo(() => {
    const map = new Map<string, string>();
    for (const node of nodes) {
      if (!node.path) continue;
      if (!map.has(node.id)) map.set(node.id, node.path);
      const folded = fold(node.id);
      if (!map.has(folded)) map.set(folded, node.path);
      // Real vault labels carry emoji and em-dashes and are often what a
      // digest line quotes, so the label is a lookup key too.
      const label = fold(node.label);
      if (!map.has(label)) map.set(label, node.path);
    }
    return map;
  }, [nodes]);

  return useMemo(
    () => ({
      ready: notes.ready,
      resolve(idOrTitle: string): string | null {
        const wanted = idOrTitle.trim();
        if (wanted.length === 0) return null;
        // Already a path? Accept it, so callers can pass either without
        // knowing which namespace a given field belongs to.
        if (/\.md$/i.test(wanted)) return wanted;
        return notes.resolve(wanted) ?? byId.get(wanted) ?? byId.get(fold(wanted)) ?? null;
      },
    }),
    [notes, byId],
  );
}

/** Path → node id, for the reverse crossing (flags are keyed by id). */
export function idsForPaths(nodes: GraphNode[], paths: Iterable<string>): Set<string> {
  const byPath = new Map(nodes.map((n) => [n.path, n.id]));
  const ids = new Set<string>();
  for (const path of paths) {
    const id = byPath.get(path);
    if (id) ids.add(id);
  }
  return ids;
}
