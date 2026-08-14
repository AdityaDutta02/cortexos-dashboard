"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { configureMock, type FailScope } from "@/lib/data";

const SCOPES: FailScope[] = [
  "all",
  "home",
  "search",
  "graph",
  "notes",
  "runs",
  "sources",
  "profile",
  "config",
];

/**
 * Reads `?fail=home,runs` to force error paths and `?nodes=600` to pad the
 * graph to a given size for frame-rate checks.
 */
export function MockFailSwitch() {
  const params = useSearchParams();
  const raw = params.get("fail");
  const nodes = params.get("nodes");

  useEffect(() => {
    const synthetic = Number.parseInt(nodes ?? "", 10);
    configureMock({
      fail: (raw ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter((s): s is FailScope => SCOPES.includes(s as FailScope)),
      syntheticNodes: Number.isFinite(synthetic) ? Math.min(5000, Math.max(0, synthetic)) : 0,
    });
  }, [raw, nodes]);

  return null;
}
