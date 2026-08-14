"use client";

import { useRef, useState } from "react";
import type { UploadFile } from "cortexos-types";
import { ds } from "@/lib/data";

/**
 * The upload queue behind the Ingest drop zone.
 *
 * Every file gets its **own** `uploadFiles([file])` call, two at a time. The
 * contract takes an array and the agent handles batches fine, but a single
 * batched request can only report progress once, at the end — and the one
 * thing a drop zone has to do is show you which of your forty files has
 * landed. One request per file gives real per-file state and isolates a
 * refusal to the file it belongs to. Concurrency is capped at 2 so a big drop
 * does not saturate the connection the rest of the dashboard is polling on.
 *
 * Nothing is ever dropped silently: every file ends in exactly one terminal
 * state, and the server's own reason text is kept verbatim — it is written to
 * be read by the user and it says what to do next.
 */
export type UploadState = "queued" | "uploading" | "accepted" | "kept" | "rejected" | "failed";

export interface UploadEntry {
  id: string;
  name: string;
  size: number;
  state: UploadState;
  /** The server's verbatim reason. Present on `kept`, `rejected` and `failed`. */
  reason?: string;
}

/** How many files are in flight at once. */
const CONCURRENCY = 2;

/**
 * "Saved but not registered" comes back in `rejected[]`, but it is a success
 * with a caveat — the bytes are in the vault and the next rebuild picks them
 * up. It must not be rendered in the same red as a refusal.
 */
function isKept(reason: string): boolean {
  return /^saved to /i.test(reason.trim());
}

let seq = 0;

export function useUpload() {
  const [entries, setEntries] = useState<UploadEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const queue = useRef<{ entry: UploadEntry; file: UploadFile }[]>([]);
  const running = useRef(0);

  /*
   * These are plain functions, not `useCallback`s: `pump` calls itself when a
   * slot frees up, and a memoised callback cannot reference itself without a
   * ref dance that adds nothing. They close over `setEntries` and two refs,
   * all of which are stable for the life of the component, so re-creating them
   * each render costs nothing and captures nothing stale.
   */
  function patch(id: string, next: Partial<UploadEntry>): void {
    setEntries((all) => all.map((e) => (e.id === id ? { ...e, ...next } : e)));
  }

  function pump(): void {
    while (running.current < CONCURRENCY && queue.current.length > 0) {
      const job = queue.current.shift();
      if (!job) break;
      running.current += 1;
      patch(job.entry.id, { state: "uploading" });
      void ds
        .uploadFiles([job.file])
        .then((result) => {
          const refusal = result.rejected[0];
          if (refusal) {
            patch(job.entry.id, {
              state: isKept(refusal.reason) ? "kept" : "rejected",
              reason: refusal.reason,
            });
          } else {
            patch(job.entry.id, { state: "accepted" });
          }
        })
        .catch((error: unknown) => {
          patch(job.entry.id, {
            state: "failed",
            reason:
              error instanceof Error
                ? error.message
                : "The upload did not complete. Nothing was saved — try it again.",
          });
        })
        .finally(() => {
          running.current -= 1;
          if (queue.current.length > 0) pump();
          else if (running.current === 0) setBusy(false);
        });
    }
  }

  function upload(files: File[]): void {
    if (files.length === 0) return;
    const added = files.map((file) => {
      seq += 1;
      const entry: UploadEntry = {
        id: `up_${seq}`,
        name: file.name,
        size: file.size,
        state: "queued",
      };
      // `File` is a `Blob`, so it satisfies UploadFile.data directly — the
      // contract deliberately types the bytes as Blob rather than File so it
      // stays implementable outside a browser.
      return { entry, file: { name: file.name, type: file.type, size: file.size, data: file } };
    });
    setEntries((all) => [...added.map((a) => a.entry), ...all]);
    queue.current.push(...added);
    setBusy(true);
    pump();
  }

  return { entries, busy, upload, clear: () => setEntries([]) };
}
