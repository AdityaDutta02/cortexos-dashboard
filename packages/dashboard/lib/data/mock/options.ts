/**
 * The mock's shared machinery: which scopes fail, how slow it is, and how big
 * the synthetic graph is.
 *
 * Everything in `./` reaches for `settle()`; nothing else here is exported to
 * the app. `configureMock` is wired to the query string by `MockFailSwitch`.
 */

import type { CortexError } from "cortexos-types";

/** Which method groups should reject. `"all"` fails everything. */
export type FailScope =
  | "all"
  | "home"
  | "search"
  | "graph"
  | "notes"
  | "runs"
  | "sources"
  | "profile"
  | "config";

interface MockOptions {
  fail: Set<FailScope>;
  /** Multiplies the simulated latency. 0 makes tests instant. */
  latency: number;
  /**
   * Pads the graph to this many nodes with synthetic ones. Used to check the
   * canvas holds frame rate at real-vault scale (~591 nodes today) without
   * inventing 500 fake notes in the fixtures.
   */
  syntheticNodes: number;
}

const options: MockOptions = { fail: new Set(), latency: 1, syntheticNodes: 0 };

/** Force error paths and graph scale at runtime — wired to the query string. */
export function configureMock(next: {
  fail?: FailScope[];
  latency?: number;
  syntheticNodes?: number;
}): void {
  if (next.fail) options.fail = new Set(next.fail);
  if (typeof next.latency === "number") options.latency = next.latency;
  if (typeof next.syntheticNodes === "number") options.syntheticNodes = next.syntheticNodes;
}

/** How many synthetic nodes the graph should be padded to. */
export function syntheticNodeCount(): number {
  return options.syntheticNodes;
}

export function err(code: CortexError["code"], message: string): CortexError {
  return { code, message };
}

/**
 * 80–250ms of latency so loading states are real rather than theoretical, then
 * either the value or the configured failure for this scope.
 */
export async function settle<T>(scope: FailScope, value: T | (() => T)): Promise<T> {
  const ms = (80 + Math.random() * 170) * options.latency;
  await new Promise((r) => setTimeout(r, ms));
  if (options.fail.has("all") || options.fail.has(scope)) {
    throw err("backend_unavailable", `The ${scope} service did not respond. It will retry.`);
  }
  return typeof value === "function" ? (value as () => T)() : value;
}
