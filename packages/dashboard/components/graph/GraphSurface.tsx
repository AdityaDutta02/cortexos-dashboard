"use client";

import dynamic from "next/dynamic";
import type { GraphViewProps } from "./GraphView";

/**
 * The graph, loaded client-side only.
 *
 * `ssr: false` is load-bearing, not a convenience: the simulation must never
 * produce geometry on the server. A server-rendered layout is what caused the
 * `Math.log2` hydration mismatch in the previous round, and this makes that
 * class of bug structurally impossible.
 */
const GraphView = dynamic(() => import("./GraphView"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-bg" aria-hidden />,
});

export function GraphSurface(props: GraphViewProps) {
  return <GraphView {...props} />;
}

export { NO_FLAGS } from "./flags";
export type { NodeFlags } from "./flags";
