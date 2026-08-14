"use client";

/**
 * The one place in this app where words beat brevity.
 *
 * A partial index does not look broken — it looks like an answer. The failure
 * mode is a confident, plausible, wrong result, and that is the failure that
 * ends the product. So this is a full-width block with a real sentence, sat
 * directly above the results it is warning about. Not a chip. Not a tooltip.
 */
export function DegradedNotice({ hitCount }: { hitCount: number }) {
  return (
    <div
      role="alert"
      data-testid="degraded-notice"
      className="border-b-2 border-warn bg-warn-tint px-3.5 py-3"
    >
      <p className="eyebrow text-warn">Incomplete index</p>
      <p className="t-body-sm mt-1 text-text">
        The search index is still being built, so{" "}
        {hitCount === 1 ? "this result is" : "these results are"} from part of your vault, not all
        of it. Things you have written may be missing here even though CORTEX has them.
      </p>
      <p className="t-body-sm mt-1.5 text-text-muted">
        Search again once the rebuild finishes.
      </p>
    </div>
  );
}

/**
 * Shown on a result that arrived without a usable citation. Spec §6.4: if it
 * can't cite, it says so — a confident uncited answer is unrecoverable.
 */
export function UncitedNotice() {
  return (
    <span
      title="This result arrived without a source reference, so it cannot be traced back to a file."
      className="eyebrow shrink-0 text-warn"
    >
      no source
    </span>
  );
}
