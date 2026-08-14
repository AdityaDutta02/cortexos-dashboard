"use client";

import { useEffect, type RefObject } from "react";
import type { Simulation } from "d3-force";
import { screenToWorld, type Camera } from "@/lib/graph-camera";
import type { SimLink, SimNode } from "./simulation";

/**
 * `window.__cortexGraph` — a read-only test hook.
 *
 * Integration tests need the camera and the node geometry, neither of which is
 * observable from pixels. Zoom staying anchored under the cursor cannot be
 * asserted from a screenshot, and — the reason `getNodes` exists — **a node
 * drawn off-camera and a node that was never in the payload look identical**.
 * That ambiguity is what let View B render 2 nodes of a 13-node neighbourhood
 * and read as correct.
 *
 * Getters only. Nothing here can mutate the graph.
 */
export function useGraphTestHook({
  camRef,
  simRef,
  simNodesRef,
  simLinksRef,
  width,
  height,
}: {
  camRef: RefObject<Camera>;
  simRef: RefObject<Simulation<SimNode, SimLink> | null>;
  simNodesRef: RefObject<SimNode[]>;
  simLinksRef: RefObject<SimLink[]>;
  width: number;
  height: number;
}): void {
  useEffect(() => {
    const w = window as unknown as { __cortexGraph?: unknown };
    w.__cortexGraph = {
      getCamera: () => ({ ...camRef.current }),
      getNodeCount: () => simNodesRef.current.length,
      getLinkCount: () => simLinksRef.current.length,
      getNodes: () => simNodesRef.current.map((n) => ({ id: n.id, x: n.x, y: n.y, r: n.r })),
      getSize: () => ({ width, height }),
      getAlpha: () => simRef.current?.alpha() ?? 0,
      screenToWorld: (x: number, y: number) => screenToWorld(camRef.current, x, y),
    };
    return () => {
      delete w.__cortexGraph;
    };
  }, [camRef, simRef, simNodesRef, simLinksRef, width, height]);
}
