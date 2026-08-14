"use client";

import { useState } from "react";
import type { Belief, CortexConfig, ObservedSignals, SuppressedBelief } from "cortexos-types";
import { ds } from "@/lib/data";
import { formatPct } from "@/lib/format";
import { useTheme } from "@/lib/theme";
import { DotBullet, Select, Toggle, useToast } from "@/components/ui";
import { DevicesSection } from "./DevicesSection";

/**
 * Profile — every belief row with its confidence, plus what was permanently
 * refuted. Spec §7: a living profile, readable in English.
 */
export function ProfilePanel({
  beliefs,
  suppressed,
  signals,
}: {
  beliefs: Belief[];
  suppressed: SuppressedBelief[];
  signals: ObservedSignals;
}) {
  return (
    <div className="flex flex-col gap-6">
      <section>
        <p className="eyebrow mb-3">Beliefs</p>
        <ul className="flex flex-col gap-4">
          {beliefs.map((b) => (
            <li key={b.id}>
              <p
                className={`t-body ${
                  b.supersededBy ? "text-text-dim line-through" : "text-text"
                }`}
              >
                {b.statement}
              </p>
              <div className="mt-1.5 flex items-center gap-2.5">
                <span className="relative block h-1.5 flex-1 bg-neutral-tint">
                  <span
                    className={`absolute inset-y-0 left-0 ${
                      !b.graduated || b.confidence < 0.5 ? "bg-warn" : "bg-blue"
                    }`}
                    style={{ width: `${Math.max(3, b.confidence * 100)}%` }}
                  />
                </span>
                <span className="t-mono shrink-0 text-text-dim">
                  {formatPct(b.confidence)} · {b.origin}
                  {b.graduated ? "" : " · unconfirmed"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {suppressed.length > 0 ? (
        <section>
          <p className="eyebrow mb-3">Never infer again</p>
          <ul className="flex flex-col gap-2">
            {suppressed.map((s) => (
              <li key={s.id} className="flex items-start gap-2.5">
                <DotBullet tone="neutral" size={6} />
                <span className="t-body-sm text-text-muted">{s.statement}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <p className="eyebrow mb-3">Observed</p>
        <p className="t-body-sm text-text-muted">
          You work {signals.workingHours.start}–{signals.workingHours.end}.
        </p>
        <ul className="mt-2 flex flex-col gap-1.5">
          {signals.repeatedQuestions.map((q) => (
            <li key={q.question} className="t-body-sm text-text-muted">
              “{q.question}” — asked {q.count} times, with no skill to serve it.
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** Settings — connectors, trickle, auth, theme. */
export function SettingsPanel({ config }: { config: CortexConfig }) {
  const { choice, setChoice } = useTheme();
  const { toast } = useToast();
  // Held locally and pushed through the DataSource, so the control is real
  // rather than a switch that looks interactive and does nothing.
  const [trickle, setTrickle] = useState(config.processing.trickle.enabled);

  const setTrickleEnabled = async (next: boolean) => {
    setTrickle(next);
    try {
      await ds.updateConfig({
        processing: { ...config.processing, trickle: { ...config.processing.trickle, enabled: next } },
      });
    } catch {
      setTrickle(!next);
      toast({ tone: "danger", message: "Could not save that" });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Select
        label="Theme"
        value={choice}
        onChange={(e) => setChoice(e.target.value as "light" | "dark" | "system")}
        options={[
          { value: "light", label: "Light" },
          { value: "dark", label: "Dark" },
          { value: "system", label: "Match my system" },
        ]}
      />

      <Toggle
        checked={trickle}
        onChange={setTrickleEnabled}
        label="Work on my backlog during my sessions"
        description={`Up to ${config.processing.trickle.max_units_per_call} small units per call. Every one shows up in the run log.`}
      />

      <section>
        <p className="eyebrow mb-3">Routines</p>
        <ul className="flex flex-col gap-3">
          {config.routines.map((r) => (
            <li key={r.id}>
              <p className="t-body-sm text-text">“{r.prompt}”</p>
              <p className="t-mono mt-0.5 text-text-dim">{r.budget}</p>
            </li>
          ))}
        </ul>
      </section>

      <DevicesSection />

      <section>
        <p className="eyebrow mb-3">Claude</p>
        <p className="t-body-sm text-text-muted">
          Signed in with your subscription. There is no API key, anywhere. Opus is never invoked
          automatically.
        </p>
        {/*
          THE BUTTON IS GONE, not disabled.

          Anthropic's device-authorization endpoint is not bound (spec §16.3),
          so the deployed instance was running `StubDeviceCodeProvider`: press
          Re-authorise and it produced a plausible user code, a
          claude.ai/link-device URL, and — on the next poll — a cheerful
          "authorised" that wrote a fabricated one-year expiry into the
          database. The user would have believed their sign-in was renewed. A
          caption reading "not finished yet" under a control that behaves like
          it worked is not a warning, it is a footnote to a false claim.

          The agent now refuses the call outright (`ReauthService.available`).
          What is left here is the instruction that actually works.
        */}
        <p className="t-caption mt-2 text-text-dim">
          To renew, run <code className="t-mono">claude setup-token</code> where you have a browser
          and update <code className="t-mono">CLAUDE_CODE_OAUTH_TOKEN</code> on the host. CORTEX
          cannot read a token&rsquo;s expiry, so it will not claim to know when this one lapses.
        </p>
      </section>

      <p className="t-mono text-text-dim">
        template v{config.serviceability.template_version} · confidence gate{" "}
        {formatPct(config.graph.confidence_gate)} · beacon{" "}
        {config.serviceability.beacon.enabled ? "on" : "off"}
      </p>
    </div>
  );
}
