"use client";

import type { OutputArtifact } from "cortexos-types";
import { formatBytes } from "@/lib/format";
import { CappedList, EmptyState, Module, RelativeTime } from "@/components/ui";

const GLYPH: Record<string, string> = {
  pdf: "▤",
  pptx: "▦",
  docx: "▤",
  md: "▤",
};

/**
 * Output history. Filename, age, and a click that OPENS it.
 *
 * These were `<a download>` pointing at `/api/outputs/download`, a route that
 * did not exist — so every output in the product's history was an anchor to a
 * 500. And a download is the wrong gesture anyway: the outputs are markdown
 * living in the vault, and the app already renders vault markdown well.
 */
export function OutputsModule({
  outputs,
  onOpen,
}: {
  outputs: OutputArtifact[];
  onOpen: (path: string) => void;
}) {
  return (
    <Module label="Output" value={<span className="t-mono text-text-dim">{outputs.length}</span>}>
      {outputs.length === 0 ? (
        <EmptyState title="Nothing generated yet" />
      ) : (
        <CappedList count={outputs.length} label="outputs" testId="output-list">
          {outputs.map((o) => {
            const ext = o.filename.split(".").pop() ?? "";
            return (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => onOpen(o.path)}
                  title={`${o.filename} · ${formatBytes(o.bytes)} · ${o.skill}`}
                  className="flex w-full items-center gap-2.5 border-b border-border/50 px-1 py-2.5 text-left transition-colors hover:bg-blue-tint"
                >
                  <span aria-hidden className="t-body text-text-dim">
                    {GLYPH[ext] ?? "▤"}
                  </span>
                  <span className="t-body min-w-0 flex-1 truncate text-text">{o.filename}</span>
                  <RelativeTime iso={o.createdAt} short className="t-mono" />
                </button>
              </li>
            );
          })}
        </CappedList>
      )}
    </Module>
  );
}
