"use client";

import { Button, useToast } from "@/components/ui";

/**
 * The terminal state of every "CORTEX prepares a prompt, you register it in
 * your own Claude" flow — the new skill (spec §8.3) and the scheduled task.
 *
 * It exists as one component because those two flows are the same claim about
 * the product: **CORTEX writes the sentence, the user's own Claude account
 * runs it.** Two hand-rolled copies of a block-plus-Copy-button would drift on
 * exactly the wording that carries that claim.
 *
 * The prompt is rendered **verbatim**. When it came from the agent, nothing
 * here reformats, trims or embellishes it.
 */
export function PromptBlock({
  prompt,
  heading,
  testId,
  copyLabel = "Copy prompt",
  copiedMessage = "Prompt copied — paste it into Claude",
}: {
  prompt: string;
  /** What the user is pasting it into. Always names Claude. */
  heading: string;
  testId: string;
  /**
   * Overridable because this block also carries a device bearer token, which is
   * not a prompt. Defaulting to the prompt wording keeps the two original
   * callers untouched while stopping the token flow from telling the user it
   * copied something it did not.
   */
  copyLabel?: string;
  copiedMessage?: string;
}) {
  const { toast } = useToast();

  return (
    <>
      <section>
        <p className="eyebrow mb-2">{heading}</p>
        <pre
          data-testid={testId}
          className="t-mono-lg max-h-[280px] overflow-auto border border-border bg-paper p-3.5 whitespace-pre-wrap text-text"
        >
          {prompt}
        </pre>
      </section>

      <Button
        variant="primary"
        block
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(prompt);
            toast({ tone: "ok", message: copiedMessage });
          } catch {
            toast({ tone: "warn", message: "Copy failed. Select the text and copy it manually." });
          }
        }}
      >
        {copyLabel}
      </Button>
    </>
  );
}
