"use client";

import { useCallback, useEffect, useState } from "react";
import type { CortexError } from "cortexos-types";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: CortexError | null;
  /** Re-runs the loader. Safe to pass straight to an onClick. */
  reload: () => void;
}

function isCortexError(v: unknown): v is CortexError {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as CortexError).code === "string" &&
    typeof (v as CortexError).message === "string"
  );
}

function toCortexError(e: unknown): CortexError {
  // A bare envelope.
  if (isCortexError(e)) return e;
  // HttpError wraps the envelope in `.error` — without this every failure
  // collapsed to `internal`, which broke the 401 → sign-in redirect.
  if (typeof e === "object" && e !== null && isCortexError((e as { error?: unknown }).error)) {
    return (e as { error: CortexError }).error;
  }
  return {
    code: "internal",
    message: e instanceof Error ? e.message : "Something went wrong.",
  };
}

interface Settled<T> {
  /** Identity of the load this result belongs to. */
  key: string | null;
  data: T | null;
  error: CortexError | null;
}

/**
 * Runs a DataSource call and exposes loading / error / data plus a reload.
 * Every screen's three states come from this one hook, so they behave
 * identically everywhere.
 *
 * Loading is *derived* — a result whose token no longer matches the current
 * load is simply not current — so no state is set synchronously inside the
 * effect and the render stays a pure function of the latest request.
 *
 * `deps` behaves like useEffect's — change it and the loader re-runs — but it
 * is compared by JSON value, not by identity, so callers can pass literals
 * without memoising. Keep deps to primitives; they are query inputs, not objects.
 */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [nonce, setNonce] = useState(0);
  // One string identifying the currently-requested load. Comparing it to the
  // settled result's key is what tells us whether we are still waiting.
  const key = `${nonce}:${JSON.stringify(deps)}`;
  const [settled, setSettled] = useState<Settled<T>>({ key: null, data: null, error: null });

  useEffect(() => {
    let cancelled = false;
    loader()
      .then((data) => {
        if (!cancelled) setSettled({ key, data, error: null });
      })
      .catch((e: unknown) => {
        if (!cancelled) setSettled({ key, data: null, error: toCortexError(e) });
      });
    return () => {
      cancelled = true;
    };
    // `key` already encodes nonce + deps; `loader` is captured per render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const current = settled.key === key;

  return {
    data: current ? settled.data : null,
    error: current ? settled.error : null,
    loading: !current,
    reload,
  };
}

/**
 * Polls a loader on an interval while `active` is true. Used by the live run
 * progress on Home; the caller stops it the moment the run reaches a terminal
 * state, so nothing keeps ticking in the background.
 */
export function usePolling<T>(
  loader: () => Promise<T>,
  intervalMs: number,
  active: boolean,
  /** Return true to stop polling — e.g. when a run reaches a terminal status. */
  stopWhen?: (data: T) => boolean,
): { data: T | null; error: CortexError | null } {
  const [result, setResult] = useState<{ data: T | null; error: CortexError | null }>({
    data: null,
    error: null,
  });

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let id = 0;
    const tick = () => {
      loader()
        .then((data) => {
          if (cancelled) return;
          setResult({ data, error: null });
          if (stopWhen?.(data)) clearInterval(id);
        })
        .catch((e: unknown) => {
          if (!cancelled) setResult({ data: null, error: toCortexError(e) });
        });
    };
    tick();
    id = window.setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // `loader` is captured per render on purpose — it closes over the id being polled.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, intervalMs]);

  return result;
}
