"use client";

import type { UploadEntry } from "@/lib/use-upload";
import { formatBytes } from "@/lib/format";
import { DotBullet } from "@/components/ui";

const TONE = {
  queued: "neutral",
  uploading: "blue",
  accepted: "ok",
  kept: "warn",
  rejected: "danger",
  failed: "danger",
} as const;

/**
 * What happened to each dropped file.
 *
 * Refusals are the one place this interface spends real words: a file that did
 * not go in is a correctness signal, and "3 rejected" tells you nothing you can
 * act on. The server's reason is shown verbatim — each one already says what to
 * do about it.
 *
 * `kept` is deliberately amber, not red: the bytes are in the vault and the
 * next index rebuild will pick them up. Colouring that as a failure would send
 * the user hunting for a file that is already there.
 */
export function UploadList({ entries, onClear }: { entries: UploadEntry[]; onClear: () => void }) {
  if (entries.length === 0) return null;
  const settled = entries.filter((e) => e.state !== "queued" && e.state !== "uploading").length;

  return (
    <section className="flex flex-col gap-1.5 border-t border-border pt-2.5" data-testid="upload-list">
      <div className="flex items-baseline justify-between gap-2">
        <p className="eyebrow">
          upload {settled}/{entries.length}
        </p>
        {settled === entries.length ? (
          <button type="button" onClick={onClear} className="t-mono text-text-dim hover:text-blue">
            clear
          </button>
        ) : null}
      </div>

      <ul className="flex max-h-40 flex-col gap-1.5 overflow-y-auto">
        {entries.map((entry) => (
          <li key={entry.id} className="flex items-start gap-2">
            <DotBullet
              tone={TONE[entry.state]}
              size={6}
              pulse={entry.state === "uploading"}
              title={entry.state}
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="t-body-sm min-w-0 truncate text-text">{entry.name}</span>
                <span className="t-mono shrink-0 text-text-dim">
                  {entry.state === "uploading"
                    ? "sending"
                    : entry.state === "queued"
                      ? "waiting"
                      : formatBytes(entry.size)}
                </span>
              </span>
              {entry.reason ? (
                /*
                 * Clamped, not truncated-with-loss: the full reason is the
                 * tooltip. A refusal reason is written to be read, but a
                 * "saved but not registered" one can carry a whole Python
                 * traceback, and 12 lines of it in a 300px rail buries the
                 * three files that landed fine.
                 */
                <span
                  title={entry.reason}
                  className={`t-caption mt-0.5 line-clamp-3 block ${
                    entry.state === "kept" ? "text-warn" : "text-danger"
                  }`}
                >
                  {entry.reason}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
