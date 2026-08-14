"use client";

import type { IngestItem } from "cortexos-types";
import { basename, formatBytes } from "@/lib/format";
import { CappedList, Dot, RelativeTime } from "@/components/ui";

const TONE = {
  done: "ok",
  processing: "blue",
  queued: "neutral",
  skipped: "neutral",
  failed: "danger",
} as const;

/**
 * What is actually in the inbox.
 *
 * THE QUESTION THIS ANSWERS is the one asked immediately after dropping a file
 * in: *did it take it?* Nothing on the dashboard could answer it. The upload
 * toast said "accepted" and vanished, the stage bars showed aggregate counts,
 * and the item list returned only whatever the pipeline happened to be
 * processing at that instant — so between uploads it was empty, and a file that
 * FAILED to convert was invisible.
 *
 * That is not hypothetical: a 9MB PDF was accepted, refused at the convert
 * stage for want of a converter, and recorded in `items.json` with the exact
 * reason — where nothing displayed it (2026-08-13).
 *
 * So failures sort to the top, and each one shows its reason in full. A file
 * the system could not read is the single most useful thing this module can
 * say, and it is the thing it was hiding.
 */
export function InboxList({ items }: { items: IngestItem[] }) {
  if (items.length === 0) {
    return (
      <p className="t-caption text-text-dim">
        Nothing in the inbox. Dropped files appear here with what happened to them.
      </p>
    );
  }

  // Failures first, then most recent. A refused file is the actionable one.
  const sorted = [...items].sort((a, b) => {
    const aFailed = a.status === "failed" ? 0 : 1;
    const bFailed = b.status === "failed" ? 0 : 1;
    if (aFailed !== bFailed) return aFailed - bFailed;
    return b.receivedAt.localeCompare(a.receivedAt);
  });
  const failed = sorted.filter((item) => item.status === "failed").length;

  return (
    <section className="mt-3 border-t border-border/60 pt-2">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <p className="eyebrow">In the inbox · {items.length}</p>
        {failed > 0 ? (
          <span className="t-mono text-danger">
            {failed} failed
          </span>
        ) : null}
      </div>

      <CappedList count={sorted.length} label="files" testId="inbox-items">
        {sorted.map((item) => (
          <li key={item.id} className="border-b border-border/40 py-1.5 last:border-b-0">
            <div className="flex items-center gap-2">
              <Dot tone={TONE[item.status] ?? "neutral"} size={6} />
              <span className="t-body-sm min-w-0 flex-1 truncate text-text" title={item.filename}>
                {basename(item.filename)}
              </span>
              <span className="t-mono shrink-0 text-text-dim">{formatBytes(item.bytes)}</span>
              <RelativeTime iso={item.receivedAt} short className="t-mono shrink-0" />
            </div>
            {/*
              In full, not truncated. "no document converter available (install
              docling or markitdown)" tells you exactly what to do; the first
              four words do not.
            */}
            {item.error ? (
              <p className="t-caption mt-0.5 pl-4 text-danger">{item.error}</p>
            ) : null}
          </li>
        ))}
      </CappedList>
    </section>
  );
}
