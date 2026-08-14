"use client";

import { useEffect, useState } from "react";
import type { NoteRef } from "cortexos-types";
import { ds } from "@/lib/data";

/**
 * Title → path, for resolving `[[Wikilinks]]`.
 *
 * Wikilinks address notes by **name**; everything else in the app addresses
 * them by path. The graph was the obvious lookup table — its node ids are
 * titles — but it only contains notes that have at least one typed edge: on
 * the live vault that resolved 2 of 31 links in a single note and marked the
 * other 29 dangling, which is a confident lie about a note that exists.
 *
 * So the index is built from `listNotes()`, paged in the background after
 * first paint. 1,292 notes is 13 requests at ~160ms each, none of them on the
 * critical path, and the result is cached for the session.
 *
 * Both keys are indexed because Obsidian-style links point at a **file name**
 * (`[[Positioning]]` → `20 Areas/Positioning.md`) while some point at the
 * note's title, and the two are frequently different.
 */

export interface NoteIndex {
  /** null when nothing answers to that name. */
  resolve(name: string): string | null;
  /** False until the index has finished loading. Never guess before it is. */
  ready: boolean;
}

const NOT_READY: NoteIndex = { resolve: () => null, ready: false };

let cache: Promise<Map<string, string>> | null = null;

function key(value: string): string {
  // Vault titles carry emoji, em-dashes and smart quotes; links rarely repeat
  // the punctuation exactly. Fold case and collapse whitespace, and nothing
  // more — stripping punctuation outright would collide distinct notes.
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function basename(path: string): string {
  return (path.split("/").pop() ?? path).replace(/\.md$/i, "");
}

async function build(): Promise<Map<string, string>> {
  const byName = new Map<string, string>();
  let cursor: string | undefined;
  // Bounded: a runaway cursor must never page for ever.
  for (let page = 0; page < 40; page += 1) {
    const result = await ds.listNotes(undefined, cursor);
    for (const note of result.items as NoteRef[]) {
      // First writer wins, so a later duplicate title cannot steal a name.
      const base = key(basename(note.path));
      if (!byName.has(base)) byName.set(base, note.path);
      const title = key(note.title);
      if (!byName.has(title)) byName.set(title, note.path);
    }
    if (!result.nextCursor) break;
    cursor = result.nextCursor;
  }
  return byName;
}

/** Shared across every panel — the index is loaded once per session. */
export function useNoteIndex(): NoteIndex {
  const [index, setIndex] = useState<Map<string, string> | null>(null);

  useEffect(() => {
    let live = true;
    cache ??= build();
    cache
      .then((map) => {
        if (live) setIndex(map);
      })
      .catch(() => {
        // A failed index is not an error the user can act on: wikilinks simply
        // stay un-annotated. Never surface it as a broken note.
        cache = null;
      });
    return () => {
      live = false;
    };
  }, []);

  if (!index) return NOT_READY;
  return {
    ready: true,
    resolve: (name) => {
      const wanted = key(name);
      // `[[Note#Heading]]` and `[[Note|alias]]` are already split before here.
      return index.get(wanted) ?? null;
    },
  };
}
