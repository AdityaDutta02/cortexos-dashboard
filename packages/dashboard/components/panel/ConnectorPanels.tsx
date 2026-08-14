"use client";

import { useState } from "react";
import type { ConnectorInfo } from "cortexos-types";
import { canCortexReach, sourceSentence } from "@/lib/discovery";
import { Button, Dot, HealthBadge, Input, RelativeTime, useToast } from "@/components/ui";

/**
 * One connector in full: its observed state, its error, when it was last
 * reached. `unconfigured` with no `lastCheckedAt` means it has never been
 * contacted — which is said in words, because "never checked" and "checked and
 * fine" are the two states a health dot alone cannot tell apart.
 */
export function ConnectorPanel({ connector }: { connector: ConnectorInfo }) {
  const reachable = canCortexReach(connector);
  const origin = sourceSentence(connector.source);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <HealthBadge health={connector.health} />
        {connector.lastCheckedAt ? (
          <RelativeTime iso={connector.lastCheckedAt} className="t-mono" />
        ) : (
          <span className="t-body-sm text-text-muted">never contacted</span>
        )}
      </div>

      {origin ? <p className="t-body text-text-muted">{origin}</p> : null}

      {reachable === false ? (
        /*
         * The distinction the health dot cannot carry: this server is real and
         * it is yours, and CORTEX still has no route to it. Said plainly, so
         * nobody wires a task to a connector that will never answer.
         */
        <p className="t-body border-l-2 border-warn bg-warn-tint px-3.5 py-3 text-text">
          CORTEX cannot call this one. It is configured in your Claude, so it works in a session
          there — but nothing CORTEX runs can reach it.
        </p>
      ) : null}

      {connector.error ? (
        <p className="t-body border-l-2 border-danger bg-danger-tint px-3.5 py-3 text-text">
          {connector.error}
        </p>
      ) : null}

      <p className="t-caption text-text-dim">
        Nothing here is ever deleted. Items stay retrievable even when a connector stops.
      </p>
    </div>
  );
}

/**
 * Add an MCP server. Deliberately three fields — a connector is a label and a
 * server address; anything more belongs in `cortex.yaml`.
 */
export function AddConnectorPanel({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const [label, setLabel] = useState("");
  const [server, setServer] = useState("");
  const [busy, setBusy] = useState(false);

  const valid = label.trim().length > 0 && server.trim().length > 0;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        setBusy(true);
        // Mock: the real write goes through the config endpoint.
        window.setTimeout(() => {
          setBusy(false);
          toast({ tone: "ok", message: `${label.trim()} added` });
          onDone();
        }, 400);
      }}
    >
      <Input
        label="Name"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Calendar"
      />
      <Input
        label="Server"
        value={server}
        onChange={(e) => setServer(e.target.value)}
        placeholder="mcp://calendar"
        hint="An MCP command or URL. It runs in your container, on your account."
      />

      <div className="flex items-center gap-2.5 border border-border bg-paper px-3.5 py-3">
        <Dot tone="ok" size={7} />
        <p className="t-body-sm text-text-muted">
          Adding a connector costs no Claude. Only extraction does.
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={busy} disabled={!valid}>
          Add
        </Button>
      </div>
    </form>
  );
}
