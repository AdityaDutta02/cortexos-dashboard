"use client";

import { useState } from "react";
import type { DeviceToken } from "cortexos-types";
import { ds } from "@/lib/data";
import { useAsync } from "@/lib/use-async";
import { Button, Input, useToast } from "@/components/ui";
import { PromptBlock } from "./PromptBlock";

/**
 * Devices allowed to reach this instance's `/mcp` endpoint — the credential
 * that makes Claude on a phone able to see the vault (spec §11, §2.2).
 *
 * This exists because the endpoint shipped without it. `POST /api/devices` was
 * built, tested and documented in Phase 1, and nothing in the dashboard called
 * it — so the only way to obtain the credential the entire cloud phase exists
 * to produce was a curl command in doc 8, on a screen already titled
 * "Connectors, routines, auth". The capability was real and had no surface.
 *
 * Two things drive the design:
 *
 * 1. **The plaintext appears exactly once.** Only a SHA-256 hash is stored, so
 *    there is no "show token again". The reveal is therefore treated as the
 *    terminal state of the flow — the same shape as the new-skill and
 *    scheduled-task panels, reusing `PromptBlock` — and it says plainly that
 *    closing it loses the token.
 * 2. **Revoked devices stay listed.** Nothing is ever deleted; a revoked row is
 *    evidence that a device once had access, which is exactly what you want to
 *    see when you are asking "who can reach my brain".
 */
export function DevicesSection() {
  const { toast } = useToast();
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  /** The one-shot plaintext. Held in memory only, never refetched. */
  const [issued, setIssued] = useState<{ token: string; label: string } | null>(null);

  // `useAsync` rather than a hand-rolled load effect: it derives loading from
  // the in-flight request instead of setting state inside the effect, so all
  // three states behave the same here as on every other screen.
  const { data: devices, error, reload } = useAsync<DeviceToken[]>(() => ds.listDevices());

  const issue = async () => {
    const name = label.trim();
    if (!name) return;
    setBusy(true);
    try {
      const result = await ds.issueDevice(name);
      setIssued({ token: result.token, label: name });
      setLabel("");
      reload();
    } catch {
      toast({ tone: "danger", message: "Could not issue a token" });
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (device: DeviceToken) => {
    try {
      await ds.revokeDevice(device.handle);
      toast({ tone: "ok", message: `${device.label} can no longer connect` });
      reload();
    } catch {
      toast({ tone: "danger", message: "Could not revoke that device" });
    }
  };

  // ---- Terminal state: the token, shown once ----------------------------
  if (issued) {
    return (
      <section className="flex flex-col gap-4">
        <div>
          <p className="eyebrow mb-2">Device added</p>
          <p className="t-body-sm text-text-muted">
            In Claude on <strong className="text-text">web or desktop</strong> — a custom connector
            cannot be added from the mobile app — add this server URL and paste the token as the
            bearer. It syncs to every device on your account afterwards, including your phone.
          </p>
        </div>

        <PromptBlock
          heading={`Bearer token for ${issued.label}`}
          prompt={issued.token}
          testId="device-token"
          copyLabel="Copy token"
          copiedMessage="Token copied — paste it into the connector"
        />

        <p className="t-caption text-warn">
          This is the only time this token is shown. Only a hash of it is stored, so it cannot be
          recovered — if you lose it, revoke the device and add it again.
        </p>

        <Button variant="secondary" block onClick={() => setIssued(null)}>
          Done
        </Button>
      </section>
    );
  }

  // ---- List + add -------------------------------------------------------
  return (
    <section>
      <p className="eyebrow mb-3">Devices</p>

      {/*
        A failed fetch and an empty list are different facts and must not render
        the same: "no devices" invites you to add one, "could not read" tells you
        the answer is unknown. Collapsing them would quietly claim nobody has
        access when the truth is that we did not look successfully.
      */}
      {error ? (
        <p className="t-body-sm text-text-dim">Could not read the device list.</p>
      ) : devices === null ? (
        <p className="t-body-sm text-text-dim">Loading…</p>
      ) : devices.length === 0 ? (
        <p className="t-body-sm text-text-muted">
          No devices yet. Add one to reach this vault from Claude on your phone.
        </p>
      ) : (
        <ul className="mb-4 flex flex-col gap-2.5" data-testid="device-list">
          {devices.map((device) => (
            <li key={device.handle} className="flex items-start justify-between gap-3">
              <span className="min-w-0">
                <span className="t-body-sm block text-text">
                  {device.label}
                  {device.revokedAt ? <span className="text-text-dim"> · revoked</span> : null}
                </span>
                <span className="t-mono block text-text-dim">
                  {device.handle} ·{" "}
                  {device.lastUsedAt ? `last used ${device.lastUsedAt.slice(0, 10)}` : "never used"}
                </span>
              </span>
              {device.revokedAt ? null : (
                <Button variant="secondary" onClick={() => void revoke(device)}>
                  Revoke
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <Input
        label="Add a device"
        placeholder="iPhone"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void issue();
        }}
        hint="A name for you — it does not have to match anything."
      />
      <Button
        variant="primary"
        block
        className="mt-3"
        loading={busy}
        disabled={label.trim().length === 0}
        onClick={() => void issue()}
      >
        Create token
      </Button>
    </section>
  );
}
