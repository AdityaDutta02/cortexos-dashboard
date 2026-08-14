"use client";

import { useSyncExternalStore } from "react";
import type { SystemHealth } from "cortexos-types";

/**
 * Whether the search index can currently be trusted.
 *
 * This exists because of the worst bug found in this build: two concurrent
 * index rebuilds collided, the index was left half-written at 56 files of 544,
 * and **search kept answering confidently from the fragment**. Eval recall fell
 * 0.92 → 0.24 with nothing on screen to say so.
 *
 * `SearchResult.degraded` is the authoritative signal and it is per-response,
 * so it has to be remembered somewhere the rest of the shell can read it.
 * That is this store. Nothing else may decide the index is fine.
 */

interface IndexStatus {
  /** The most recent search reported a partial index. */
  degraded: boolean;
  /** ISO time of the search that reported it. */
  at: string | null;
  /** How many results that degraded response returned. */
  hitCount: number;
}

let status: IndexStatus = { degraded: false, at: null, hitCount: 0 };
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((l) => l());
}

/** Called after every search response — including the healthy ones. */
export function reportSearchIndex(degraded: boolean, hitCount: number): void {
  if (status.degraded === degraded && !degraded) return;
  status = { degraded, at: new Date().toISOString(), hitCount };
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const SERVER_SNAPSHOT: IndexStatus = { degraded: false, at: null, hitCount: 0 };

export function useIndexStatus(): IndexStatus {
  return useSyncExternalStore(
    subscribe,
    () => status,
    () => SERVER_SNAPSHOT,
  );
}

/**
 * Health issues that are about the index specifically. The agent reports these
 * as plain sentences, so this matches on the words it actually uses rather
 * than inventing a code the contract does not have.
 */
export function indexIssues(health: SystemHealth | null): SystemHealth["issues"] {
  if (!health) return [];
  return health.issues.filter((i) => /\bindex\b|\brebuild\b/i.test(i.message));
}

/** True when health itself says the index is mid-rebuild or failed to build. */
export function indexUnsettled(health: SystemHealth | null): boolean {
  return indexIssues(health).some((i) => i.severity === "error" || /rebuild/i.test(i.message));
}
