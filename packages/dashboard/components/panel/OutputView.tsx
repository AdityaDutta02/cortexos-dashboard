"use client";

import { useEffect, useState } from "react";
import type { Note } from "cortexos-types";
import { ds } from "@/lib/data";
import { basename } from "@/lib/format";
import { Markdown } from "@/components/detail/Markdown";
import { Spinner } from "@/components/ui";

/** Extensions the markdown renderer can show. Everything else is a file. */
const VIEWABLE = /\.(md|markdown|txt|json|ya?ml|csv)$/i;

export function isViewable(path: string): boolean {
  return VIEWABLE.test(path);
}

/**
 * What a run actually produced, rendered.
 *
 * THE POINT OF THIS COMPONENT. A run panel used to show a filename and a log —
 * the log being an account of the work, not the work. The thing the user pressed
 * the button for was one more click away, behind a path. So the deliverable is
 * shown here, inline and formatted, and the log becomes what it should always
 * have been: the detail you open when the output is wrong.
 *
 * Fetched through `notes/read`, which is how the whole app reads a vault file —
 * `outputs/` is inside the vault, so an artifact is a note like any other. That
 * is also why this does not go near `downloadUrl`.
 */
export function OutputView({ path }: { path: string }) {
  /*
   * One piece of state carrying the path it belongs to, rather than three that
   * have to be reset in step. Resetting on every `path` change meant calling
   * setState inside the effect body — which React (and the lint rule) rightly
   * objects to — and it is unnecessary: a result whose path no longer matches
   * is simply not the current one.
   */
  const [state, setState] = useState<{ path: string; note?: Note; error?: string } | null>(null);

  useEffect(() => {
    let stopped = false;
    ds.readNote(path)
      .then((note) => {
        if (!stopped) setState({ path, note });
      })
      .catch((cause: unknown) => {
        if (!stopped) {
          setState({
            path,
            error: cause instanceof Error ? cause.message : "Could not read that file.",
          });
        }
      });
    return () => {
      stopped = true;
    };
  }, [path]);

  const current = state?.path === path ? state : null;

  if (current?.error) {
    return (
      <p className="t-body-sm text-warn">
        {basename(path)} — {current.error}
      </p>
    );
  }
  if (!current?.note) {
    return (
      <p className="t-body-sm flex items-center gap-2 text-text-dim">
        <Spinner /> Loading {basename(path)}…
      </p>
    );
  }
  return <Markdown source={stripFrontmatter(current.note.content)} />;
}

/**
 * Frontmatter is metadata about the file, not the file's content, and rendering
 * it puts `title: … / date: … / status: draft` at the top of every output as a
 * literal `---` block. The note panel shows frontmatter deliberately, in its own
 * component; an output is being read as a document.
 */
function stripFrontmatter(content: string): string {
  const match = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/.exec(content);
  return match ? content.slice(match[0].length) : content;
}
