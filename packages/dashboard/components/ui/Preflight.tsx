"use client";

import type { PreflightEstimate } from "cortexos-types";
import { formatCount, formatPct } from "@/lib/format";
import { Button } from "./Button";
import { Dialog } from "./Dialog";

/**
 * The consent gate. Spec §2.4: an estimate, then an explicit confirm, before
 * anything spends Claude — **never skipped, for any foreground batch.**
 *
 * This is the one place in the app a sentence survives deliberately. It is the
 * moment the user agrees to spend, so it says what it is spending in words as
 * well as in numbers.
 *
 * Shared rather than copied: the ingest backlog button and every task the
 * dashboard's `+` creates go through the same gate, and two hand-rolled
 * versions would eventually disagree about what the numbers mean.
 */
export function PreflightDialog({
  open,
  estimate,
  starting,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  estimate: PreflightEstimate | null;
  /** The run is being dispatched — keeps the dialog up and the button busy. */
  starting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title="Before this runs"
      description="Nothing has been sent to Claude yet."
      width="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          {/*
            An empty batch is not a run. Confirming one dispatched a run that
            read nothing, finished in under a second and toasted "0 notes
            updated" — which from the outside is a button that flashes and does
            nothing at all. That was the whole of "I click Process and it just
            disappears".
          */}
          <Button
            variant="primary"
            loading={starting}
            disabled={estimate?.itemCount === 0}
            onClick={onConfirm}
            data-testid="preflight-confirm"
          >
            Run
          </Button>
        </>
      }
    >
      {estimate ? (
        <div className="flex flex-col gap-4">
          <p className="t-body-lg text-text">{estimate.summary}</p>
          <dl className="grid grid-cols-3 gap-3 border-t border-border pt-4">
            <Fact k="files" v={formatCount(estimate.itemCount)} />
            {/*
              Tokens when there is no plan to take a percentage of. The cell
              read `0%` on every run of a fresh instance — a share of an
              invented weekly allowance, which on a consent dialog reads as
              "this costs nothing".
            */}
            {estimate.estimatedHeadroomPct === null ? (
              <Fact
                k="tokens"
                v={formatCount(
                  estimate.estimatedTokens.input + estimate.estimatedTokens.output,
                )}
                accent
              />
            ) : (
              <Fact k="claude" v={formatPct(estimate.estimatedHeadroomPct)} accent />
            )}
            <Fact k="mins" v={`${estimate.estimatedMinutes}`} />
          </dl>

          {/*
            WHICH ONES. A count is not consent — "25 items" cannot tell you
            whether the file you dropped a minute ago is in this batch, and
            usually it was not, because the count came from the promotion queue
            while the file was still converting. Naming them makes that visible
            here, for free, instead of after the spend.
          */}
          {estimate.items && estimate.items.length > 0 ? (
            <section className="border-t border-border pt-4" data-testid="preflight-items">
              <p className="eyebrow mb-1.5">what it will read</p>
              <ul className="flex flex-col gap-0.5">
                {estimate.items.map((item) => (
                  <li key={item} className="t-mono truncate text-text-dim" title={item}>
                    {item}
                  </li>
                ))}
              </ul>
              {estimate.itemCount > estimate.items.length ? (
                <p className="t-caption mt-1.5 text-text-muted">
                  and {formatCount(estimate.itemCount - estimate.items.length)} more.
                </p>
              ) : null}
            </section>
          ) : null}
        </div>
      ) : null}
    </Dialog>
  );
}

function Fact({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div>
      <dt className="eyebrow">{k}</dt>
      <dd className={`t-metric ${accent ? "text-blue" : "text-text"}`}>{v}</dd>
    </div>
  );
}
