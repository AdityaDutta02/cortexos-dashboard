"use client";

import type { ConnectorHealth, ConnectorInfo } from "cortexos-types";
import { byUsefulnessThenName, canCortexReach, sourceSentence, sourceTag } from "@/lib/discovery";
import { CappedList, Dot, EmptyState, Module, ModuleAdd, RelativeTime } from "@/components/ui";

const TONE: Record<ConnectorHealth, "ok" | "warn" | "danger" | "neutral"> = {
  ok: "ok",
  degraded: "warn",
  failing: "danger",
  unconfigured: "neutral",
};

/**
 * Connectors — every MCP server this machine actually has, wherever it lives.
 *
 * This module showed **zero** on a machine with twelve MCP servers in
 * `~/.claude.json` and two more in Claude Desktop. Two bugs stacked: it once
 * read `listSources()` (ingest templates, five phantom rows), and after that
 * was fixed it read only `cortex.yaml`, which is empty. Discovery now spans
 * repo, vault, `~/.claude` and Claude Desktop, and this renders what it finds.
 *
 * **Origin and reachability are shown, not flattened.** A server configured in
 * the user's Claude is real and worth seeing, but CORTEX may have no way to
 * call it — so the row says which, and the module says how many. Overclaiming
 * ownership of someone's connector is the failure mode on the other side of
 * showing nothing.
 */
export function ConnectorsModule({
  connectors,
  onOpen,
  onAdd,
}: {
  connectors: ConnectorInfo[];
  onOpen: (id: string) => void;
  onAdd: () => void;
}) {
  const rows = byUsefulnessThenName(connectors, canCortexReach);
  const failing = connectors.filter((c) => c.health === "failing").length;
  // Two groups. On a real machine the split is 0 and 14, and one flat list
  // would imply CORTEX owns servers it has no route to.
  const ours = rows.filter((c) => canCortexReach(c) !== false);
  const theirs = rows.filter((c) => canCortexReach(c) === false);

  const row = (c: ConnectorInfo) => {
    const reachable = canCortexReach(c);
    const origin = sourceTag(c.source);
    return (
      <li key={c.id}>
        <button
          type="button"
          onClick={() => onOpen(c.id)}
          title={[c.error, sourceSentence(c.source), reachabilityWord(reachable)]
            .filter(Boolean)
            .join(" ")}
          className="flex w-full items-center gap-2.5 border-b border-border/50 px-1 py-2.5 text-left transition-colors hover:bg-blue-tint"
        >
          <Dot tone={TONE[c.health]} size={7} pulse={c.health === "failing"} />
          <span
            className={`t-body min-w-0 flex-1 truncate ${
              reachable === false ? "text-text-muted" : "text-text"
            }`}
          >
            {c.label}
          </span>
          {origin ? <span className="t-mono shrink-0 text-text-dim">{origin}</span> : null}
          {c.lastCheckedAt ? (
            <RelativeTime iso={c.lastCheckedAt} short className="t-mono" />
          ) : (
            <span className="t-mono shrink-0 text-text-dim">never</span>
          )}
        </button>
      </li>
    );
  };

  return (
    <Module
      label="Connectors"
      value={
        connectors.length === 0 ? (
          <span className="t-mono text-text-dim">0</span>
        ) : (
          <>
            <span className="t-mono text-text-dim">{connectors.length}</span>
            {failing > 0 ? (
              <Dot tone="danger" title={`${failing} failing`} pulse />
            ) : (
              <Dot tone="ok" />
            )}
          </>
        )
      }
      action={<ModuleAdd label="Add an MCP server" onClick={onAdd} />}
    >
      {rows.length === 0 ? (
        <EmptyState
          title="No connectors found"
          detail="Nothing configured in cortex.yaml, your ~/.claude, or Claude Desktop. Add an MCP server with +."
        />
      ) : (
        <div data-testid="connector-list">
          {ours.length > 0 ? (
        <CappedList count={ours.length} label="connectors">{ours.map(row)}</CappedList>
      ) : null}

          {theirs.length > 0 ? (
            <section className={ours.length > 0 ? "mt-3 border-t border-border/50 pt-2" : ""}>
              <p className="eyebrow">In your Claude · {theirs.length}</p>
              {/*
                A correctness signal, so it spends words. "CORTEX can see it"
                and "CORTEX can call it" are different claims, and a health dot
                cannot separate them — showing these servers without saying
                which is the overclaim on the far side of showing none at all.
              */}
              <p
                data-testid="connectors-unreachable"
                className="t-caption mt-0.5 mb-1.5 text-text-dim"
              >
                Configured in your own Claude, not in CORTEX. They work in a session there; nothing
                CORTEX runs can call them.
              </p>
              <CappedList count={theirs.length} label="connectors">{theirs.map(row)}</CappedList>
            </section>
          ) : null}
        </div>
      )}
    </Module>
  );
}

function reachabilityWord(reachable: boolean | null): string {
  if (reachable === true) return "CORTEX can call this.";
  if (reachable === false) return "CORTEX cannot call this — it runs in your Claude.";
  return "";
}
