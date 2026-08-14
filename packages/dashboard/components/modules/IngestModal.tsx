"use client";

import type { IngestChain } from "cortexos-types";
import { ds } from "@/lib/data";
import { formatBytes } from "@/lib/format";
import { usePolling } from "@/lib/use-async";
import { Button, Dialog } from "@/components/ui";
import type { UploadEntry } from "@/lib/use-upload";

/**
 * WHAT HAPPENED TO THE FILE I JUST DROPPED.
 *
 * The question the dashboard could not answer. A 6.9MB PDF was accepted,
 * converted, committed into `_Inbox` and pushed — the entire chain worked — and
 * every surface stayed silent, because the Ingest module headlined a promotion
 * queue that has nothing to do with a dropped file. The owner reasonably
 * concluded ingest was broken (2026-08-13).
 *
 * So this is a receipt, not a spinner. Each row ends in two things a person can
 * check: a vault path they can open, and a commit they can revert. Everything
 * between is the live tool-call log, which is the only honest way to show a
 * turn that spends two minutes reading files without saying a word.
 *
 * It never closes itself on failure. A toast that vanishes is how a refusal
 * becomes invisible.
 */

const STEP_LABEL: Record<IngestChain["step"], string> = {
  converting: "converting",
  filing: "saving to your vault",
  wiring: "connecting it to your graph",
  placing: "filing it where it belongs",
  done: "done",
  failed: "failed",
};

/*
 * The steps that ACTUALLY HAPPEN.
 *
 * `placing` was absent from this list for one release, because the step existed
 * in the type and not in the chain and listing it would have ticked a green
 * check beside work nothing performed — the precise failure this modal exists
 * to end. It is here now because the move is implemented.
 */
const STEPS: IngestChain["step"][] = ["converting", "filing", "wiring", "placing"];

export function IngestModal({
  entries,
  open,
  onClose,
}: {
  /** Client-side upload state — the only source of truth before the server has an id. */
  entries: UploadEntry[];
  open: boolean;
  onClose: () => void;
}) {
  /*
   * Polled while the modal is up, and only while it is up. 1s is fast enough
   * that a step change feels immediate and slow enough to be free — the handler
   * reads an in-memory map and spends nothing.
   */
  const { data: chains } = usePolling<IngestChain[]>(async () => ds.listIngestChain(), 1_000, open);
  const rows = chains ?? [];

  const active = rows.some((row) => row.step !== "done" && row.step !== "failed");
  const uploading = entries.some((e) => e.state === "queued" || e.state === "uploading");
  const busy = active || uploading;

  // The parent owns `open`; there is no second copy of that state here. A
  // local `dismissed` flag would be a duplicate that has to be re-synced on
  // every reopen, which is exactly the cascading-render smell.
  if (!open) return null;

  /*
   * Files rejected before they ever reached the server have no chain row —
   * they were refused at validation, on the client's round trip. They belong in
   * the same list, because from where the user is standing they dropped one
   * batch and want one answer about all of it.
   */
  const refused = entries.filter((e) => e.state === "rejected" || e.state === "failed");

  return (
    <Dialog
      open
      // Closing mid-flight does not cancel anything — the chain runs on the
      // server, which is what the footer button says.
      onClose={onClose}
      title={busy ? "Taking your files" : "Done"}
      description={
        busy
          ? "Converting and saving are free. Connecting spends Claude."
          : "Everything below is in your vault."
      }
      width="md"
      footer={
        <Button
          variant={busy ? "ghost" : "primary"}
          onClick={() => {
            if (!busy) void ds.clearFinishedChains();
            onClose();
          }}
          data-testid="ingest-modal-close"
        >
          {busy ? "Close — this keeps running" : "Done"}
        </Button>
      }
    >
      <div className="flex flex-col gap-3" data-testid="ingest-modal">
        {rows.length === 0 && refused.length === 0 ? (
          <p className="t-body text-text-muted">
            {uploading ? "Uploading…" : "Nothing yet."}
          </p>
        ) : null}

        {rows.map((row) => (
          <ChainRow key={row.itemId} row={row} />
        ))}

        {refused.map((entry) => (
          <section key={entry.id} className="border border-danger/40 bg-danger-tint px-3 py-2.5">
            <p className="t-body text-text">{entry.name}</p>
            <p className="t-body-sm mt-0.5 text-text-muted">{entry.reason}</p>
          </section>
        ))}
      </div>
    </Dialog>
  );
}

function ChainRow({ row }: { row: IngestChain }) {
  const failed = row.step === "failed";
  const reached = STEPS.indexOf(row.step);

  return (
    <section
      className={`border px-3 py-2.5 ${failed ? "border-danger/40 bg-danger-tint" : "border-border bg-paper"}`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="t-body min-w-0 truncate text-text" title={row.filename}>
          {row.filename}
        </p>
        <span className="t-mono shrink-0 text-text-dim">{formatBytes(row.bytes)}</span>
      </div>

      {/* The steps, with the current one named. Not a percentage — there is no
          honest denominator, and a bar parked at 0% reads as a hang. */}
      <ol className="mt-2 flex flex-col gap-0.5">
        {STEPS.map((step, index) => {
          const done = row.step === "done" || index < reached;
          const now = index === reached && !failed;
          return (
            <li
              key={step}
              className={`t-mono flex items-center gap-2 ${
                done ? "text-text-dim" : now ? "text-text" : "text-text-muted/50"
              }`}
            >
              <span aria-hidden className="w-3">
                {done ? "✓" : now ? "⋯" : "○"}
              </span>
              <span>{STEP_LABEL[step]}</span>
            </li>
          );
        })}
      </ol>

      {/* The receipts. A path to open and a sha to revert — the two things that
          make "it is in your vault" checkable rather than a claim. */}
      {row.vaultPath ? (
        <p className="t-body-sm mt-2 text-text">
          <span className="t-mono text-blue">{row.vaultPath}</span>
          {row.sha ? <span className="t-mono text-text-dim"> · {row.sha.slice(0, 7)}</span> : null}
        </p>
      ) : null}

      {typeof row.edgesWritten === "number" && row.edgesWritten > 0 ? (
        <p className="t-caption mt-0.5 text-text-muted">
          {row.edgesWritten} connection{row.edgesWritten === 1 ? "" : "s"} written
          {row.edgesAlreadyKnown ? `, ${row.edgesAlreadyKnown} already known` : null}
        </p>
      ) : null}

      {row.sourceRemoved ? (
        <p className="t-caption mt-0.5 text-text-muted">
          Original removed — the note is the copy that matters.
        </p>
      ) : null}

      {/* In full, never truncated. "this looks like a scanned document with no
          text layer" tells you what to do; the first four words do not. */}
      {row.warning ? <p className="t-body-sm mt-1.5 text-warn">{row.warning}</p> : null}
      {row.error ? <p className="t-body-sm mt-1.5 text-danger">{row.error}</p> : null}
    </section>
  );
}
