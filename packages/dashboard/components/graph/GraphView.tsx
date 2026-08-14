"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Simulation } from "d3-force";
import type { GraphEdge, GraphNode } from "cortexos-types";
import {
  boundsOf,
  fitTo,
  isZoomIntent,
  pan,
  relaxScale,
  screenToWorld,
  zoomAt,
  type Camera,
} from "@/lib/graph-camera";
import { useTheme } from "@/lib/theme";
import { CamControls } from "./CamControls";
import { draw, drawPulse } from "./draw";
import { useGraphTestHook } from "./use-test-hook";
import { NO_FLAGS, type NodeFlags } from "./flags";
import { readPalette, relationClass, type Palette, type RelationClass } from "./palette";
import {
  buildSimulation,
  hitTest,
  neighboursOf,
  reheat,
  toSimLinks,
  toSimNodes,
  type SimLink,
  type SimNode,
} from "./simulation";

export interface GraphViewProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  flags?: NodeFlags;
  /** Node **id**, not path — selection is graph identity. */
  selected?: string | null;
  /** Receives the whole node: callers need the id for the graph, the path for the panel. */
  onSelect: (node: { id: string; path: string }) => void;
  /**
   * Relation **classes** to leave out. Removes links from the simulation, so
   * the layout re-settles rather than merely hiding paint.
   *
   * Classes rather than relation names, because the live vault carries 69
   * relation types and a name list can only ever cover the ones somebody
   * remembered to type. `["reference"]` — the default — is what makes the
   * graph show asserted relationships and not every passing mention.
   */
  hiddenClasses?: RelationClass[];
  className?: string;
}

/**
 * The interactive graph: canvas rendering, d3-force physics, Obsidian-style
 * camera and drag.
 *
 * Client-only by construction — it is loaded through a dynamic import with
 * `ssr: false`, so no geometry is ever produced on the server. That removes an
 * entire class of hydration bug rather than working around it.
 */
type PointerMap = Map<number, { x: number; y: number }>;

/**
 * Distance between the first two active pointers, in canvas pixels. The ratio
 * of this value between consecutive moves *is* the pinch zoom factor.
 *
 * Reads the first two entries rather than all of them: a third finger landing
 * mid-pinch should not suddenly redefine the gesture's scale.
 */
function pointerSpread(pointers: PointerMap): number {
  const [a, b] = [...pointers.values()];
  if (!a || !b) return 0;
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Midpoint of the first two pointers — the anchor the zoom happens about. */
function pointerMidpoint(pointers: PointerMap): { x: number; y: number } {
  const [a, b] = [...pointers.values()];
  if (!a || !b) return { x: 0, y: 0 };
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export default function GraphView({
  nodes,
  edges,
  flags = NO_FLAGS,
  selected = null,
  onSelect,
  hiddenClasses,
  className,
}: GraphViewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pulseRef = useRef<HTMLCanvasElement>(null);
  const { resolved } = useTheme();

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hoverId, setHoverId] = useState<string | null>(null);

  // Read straight from the document. `resolved` changing is what re-reads it,
  // so a theme flip repaints the canvas on the next frame.
  const palette: Palette = useMemo(() => readPalette(resolved), [resolved]);

  // Mutable render state — deliberately outside React so a 60fps loop never
  // touches the reconciler.
  const camRef = useRef<Camera>({ x: 0, y: 0, scale: 1 });
  const simRef = useRef<Simulation<SimNode, SimLink> | null>(null);
  const simNodesRef = useRef<SimNode[]>([]);
  const simLinksRef = useRef<SimLink[]>([]);
  const hoverRef = useRef<string | null>(null);
  const dragNodeRef = useRef<SimNode | null>(null);
  const panRef = useRef<{ x: number; y: number } | null>(null);
  const movedRef = useRef(false);
  const pointerRef = useRef({ x: 0, y: 0 });
  /**
   * Every pointer currently down, by id. A mouse never puts more than one here;
   * a touchscreen does, and that is the whole basis of pinch. Tracking them
   * explicitly is what lets the second finger *cancel* an in-flight pan or node
   * drag rather than fight it — without this the first finger keeps panning
   * while the second zooms, and the graph lurches.
   */
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  /** Distance between the two active pointers on the previous move. */
  const pinchRef = useRef<number | null>(null);
  const flagsRef = useRef(flags);
  const selectedRef = useRef(selected);
  /**
   * Repaint only when something actually changed.
   *
   * Previously the loop cleared and redrew the whole canvas 60×/second even
   * when the simulation had settled and nothing had moved. Profiling showed
   * ~95% of the time in the browser rasteriser, so the fix is to stop asking
   * it to rasterise.
   */
  const dirtyRef = useRef(true);
  /**
   * Is the camera still following the layout?
   *
   * True from the moment a node set is handed to the simulation until the user
   * takes the camera themselves (pan, zoom, or a node drag). While it is true
   * the camera re-frames on **every tick**, which is what makes a neighbourhood
   * appear framed the instant it is selected rather than 2.6 seconds later.
   *
   * The previous version framed once, on the simulation's `end` event, with a
   * 2,600ms timer as a safety net. Measured on the live vault: for the first
   * ~3 seconds after opening a node the camera sat at identity while the layout
   * expanded from d3's phyllotaxis seed at the world origin, so a 20-node
   * neighbourhood drew a handful of enormous circles and everything else was
   * off-camera — indistinguishable from a neighbourhood that only had two
   * nodes in it.
   */
  const autoFitRef = useRef(true);

  // Mirrored in an effect, never during render: the raf loop reads these
  // without wanting to re-subscribe every time a prop identity changes.
  useEffect(() => {
    flagsRef.current = flags;
    selectedRef.current = selected;
    dirtyRef.current = true;
  }, [flags, selected]);

  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  /* ---- size ------------------------------------------------------------ */
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({ width: Math.round(width), height: Math.round(height) });
    });
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  /* ---- simulation ------------------------------------------------------ */
  const filtered = useMemo(() => {
    const present = new Set(nodes.map((n) => n.id));
    const hidden = new Set(hiddenClasses ?? []);
    // d3-force throws on a link naming a node it does not have, so a dangling
    // edge must never reach the simulation.
    return edges.filter(
      (e) =>
        present.has(e.source) &&
        present.has(e.target) &&
        !hidden.has(relationClass(e.relation)),
    );
  }, [nodes, edges, hiddenClasses]);

  useEffect(() => {
    if (size.width === 0 || size.height === 0) return;

    const simNodes = toSimNodes(nodes);
    // Carry positions across a filter change so the graph re-settles rather
    // than teleporting.
    const previous = new Map(simNodesRef.current.map((n) => [n.id, n]));
    for (const n of simNodes) {
      const old = previous.get(n.id);
      if (old?.x !== undefined) {
        n.x = old.x;
        n.y = old.y;
        n.vx = old.vx;
        n.vy = old.vy;
      }
    }
    const simLinks = toSimLinks(filtered);

    simRef.current?.stop();
    const sim = buildSimulation(simNodes, simLinks, {
      width: size.width,
      height: size.height,
      reducedMotion,
    });

    /**
     * Frame whatever the layout is right now. The bottom inset keeps the
     * legend from sitting on top of the graph.
     */
    const LEGEND_INSET = 52;
    const frameNow = () => {
      const b = boundsOf(simNodes);
      if (b) {
        camRef.current = fitTo(b, size.width, Math.max(80, size.height - LEGEND_INSET));
      }
      dirtyRef.current = true;
    };

    sim.on("tick", () => {
      // Follow the layout while it expands. `boundsOf` is one O(n) pass against
      // a tick that is already O(n log n), so this costs nothing measurable and
      // it removes the whole window in which the graph is drawn off-camera.
      if (autoFitRef.current) frameNow();
      dirtyRef.current = true;
    });
    simRef.current = sim;
    simNodesRef.current = simNodes;
    simLinksRef.current = simLinks;
    dirtyRef.current = true;

    /*
     * A new node set re-arms the camera. This is the fix for View B: selecting
     * a node rebuilds the simulation, and until now the camera kept the frame
     * it had computed for the *previous* node set — a stale camera over fresh
     * geometry, which draws a correct-looking subset of an incomplete picture.
     * Toggling a relation class rebuilds it too, and re-settles the layout, so
     * it re-arms for the same reason.
     */
    autoFitRef.current = true;
    /*
     * `forceSimulation` seeds x/y synchronously in its constructor, so there is
     * a real layout to frame before the first tick and before the first paint.
     * Under `reducedMotion` this is also the *only* fit: `buildSimulation`
     * settles in a synchronous loop and then never ticks again.
     */
    frameNow();

    return () => {
      sim.stop();
    };
  }, [nodes, filtered, size.width, size.height, reducedMotion]);

  /* ---- render loop ----------------------------------------------------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Resolution is traded against graph size. A dense graph is read as shape,
    // not as crisp edges, and the backing store is the dominant raster cost.
    // The backing store is the single biggest raster cost, and it scales with
    // how much geometry is drawn — not with node count alone. Small
    // neighbourhood views (View B) stay retina-crisp; a whole-vault graph
    // drops to 1×, where it is read as shape rather than as crisp edges.
    const heavy = nodes.length > 120 || filtered.length > 200;
    const dpr = Math.min(heavy ? 1 : 2, window.devicePixelRatio || 1);
    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;

    const pulseCanvas = pulseRef.current;
    const pctx = pulseCanvas?.getContext("2d") ?? null;
    if (pulseCanvas) {
      pulseCanvas.width = size.width * dpr;
      pulseCanvas.height = size.height * dpr;
      pulseCanvas.style.width = `${size.width}px`;
      pulseCanvas.style.height = `${size.height}px`;
    }

    let raf = 0;
    let start = performance.now();

    // Assigning canvas.width/height clears the bitmap, so any re-init of this
    // effect — a resize, a theme flip, a node-count change — must force one
    // full repaint. Without this a theme toggle left the base layer blank and
    // only the pulse overlay kept drawing.
    dirtyRef.current = true;

    // Resolve the font stack once: the canvas needs real family names.
    const fontFamily =
      getComputedStyle(canvas).fontFamily || '"DM Sans", sans-serif';

    let lastPulse = 0;
    const hasConflicts = () => flagsRef.current.conflict.size > 0;

    const frame = (now: number) => {
      // The conflict ring animates, so it drives its own repaints — but at
      // 24fps, not 60, and only when a conflict exists at all.
      let pulseNow = false;
      if (!reducedMotion && hasConflicts() && now - lastPulse > 33) {
        lastPulse = now;
        pulseNow = true;
      }
      const hover = hoverRef.current;
      const focusSet = hover ? neighboursOf(simLinksRef.current, hover) : null;
      const common = {
        nodes: simNodesRef.current,
        links: simLinksRef.current,
        camera: camRef.current,
        palette,
        flags: flagsRef.current,
        focusSet,
        hoverId: hover,
        selectedId: selectedRef.current,
        width: size.width,
        height: size.height,
        pulse: reducedMotion ? 0 : ((now - start) % 2400) / 2400,
        fontFamily,
      };

      // The rings also have to follow the camera, so a dirty base forces one.
      if (pctx && (pulseNow || dirtyRef.current)) {
        pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawPulse(pctx, common);
      }

      if (dirtyRef.current) {
        dirtyRef.current = false;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        draw(ctx, common);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [size.width, size.height, palette, reducedMotion, nodes.length, filtered.length]);

  /* ---- pointer --------------------------------------------------------- */
  const localPoint = useCallback((e: { clientX: number; clientY: number }) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    return { x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) };
  }, []);

  /**
   * Unpin whatever was being dragged, without treating the lift as a tap.
   * Declared above `onPointerDown` because it appears in that callback's
   * dependency array, which is evaluated during render — a `const` referenced
   * before its declaration there is a TDZ throw, not a lint nit.
   */
  const releaseHeldNode = useCallback(() => {
    const held = dragNodeRef.current;
    if (!held) return;
    held.fx = null;
    held.fy = null;
    dragNodeRef.current = null;
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const { x, y } = localPoint(e);
      pointerRef.current = { x, y };
      pointersRef.current.set(e.pointerId, { x, y });
      movedRef.current = false;

      // A second finger means the gesture was never a pan or a drag — it is a
      // pinch. Release whatever the first finger had taken, so the node it was
      // holding re-settles instead of being flung across the canvas.
      if (pointersRef.current.size === 2) {
        releaseHeldNode();
        panRef.current = null;
        movedRef.current = true; // never let the lift register as a tap-select
        pinchRef.current = pointerSpread(pointersRef.current);
        autoFitRef.current = false;
        return;
      }

      const [wx, wy] = screenToWorld(camRef.current, x, y);
      const hit = hitTest(simNodesRef.current, wx, wy, 4 / camRef.current.scale);

      // Either gesture is the user taking the camera. Auto-fit would otherwise
      // chase the dragged node and fight the pan, one frame behind.
      autoFitRef.current = false;
      if (hit) {
        dragNodeRef.current = hit;
        hit.fx = hit.x;
        hit.fy = hit.y;
        if (simRef.current && !reducedMotion) reheat(simRef.current, 0.35);
        dirtyRef.current = true;
      } else {
        panRef.current = { x, y };
      }
      (e.target as Element).setPointerCapture?.(e.pointerId);
    },
    [localPoint, reducedMotion, releaseHeldNode],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const { x, y } = localPoint(e);
      const dx = x - pointerRef.current.x;
      const dy = y - pointerRef.current.y;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) movedRef.current = true;
      pointerRef.current = { x, y };
      if (pointersRef.current.has(e.pointerId)) {
        pointersRef.current.set(e.pointerId, { x, y });
      }

      // Pinch wins over everything else while two fingers are down. Anchoring
      // the zoom at the midpoint is what makes it feel like the canvas is being
      // stretched between the fingers rather than scaled about its centre.
      if (pointersRef.current.size >= 2) {
        const spread = pointerSpread(pointersRef.current);
        const previous = pinchRef.current;
        pinchRef.current = spread;
        if (previous && previous > 0 && spread > 0) {
          const mid = pointerMidpoint(pointersRef.current);
          camRef.current = zoomAt(camRef.current, mid.x, mid.y, spread / previous);
          camRef.current = relaxScale(camRef.current, mid.x, mid.y);
          dirtyRef.current = true;
        }
        return;
      }

      const held = dragNodeRef.current;
      if (held) {
        const [wx, wy] = screenToWorld(camRef.current, x, y);
        held.fx = wx;
        held.fy = wy;
        if (simRef.current && !reducedMotion) reheat(simRef.current, 0.3);
        else simRef.current?.tick();
        dirtyRef.current = true;
        return;
      }

      if (panRef.current) {
        camRef.current = pan(camRef.current, dx, dy);
        dirtyRef.current = true;
        return;
      }

      const [wx, wy] = screenToWorld(camRef.current, x, y);
      const hit = hitTest(simNodesRef.current, wx, wy, 4 / camRef.current.scale);
      const id = hit?.id ?? null;
      if (id !== hoverRef.current) {
        hoverRef.current = id;
        dirtyRef.current = true;
        setHoverId(id);
      }
    },
    [localPoint, reducedMotion],
  );

  const endPointer = useCallback(
    (e?: React.PointerEvent) => {
      if (e) pointersRef.current.delete(e.pointerId);
      else pointersRef.current.clear();

      // Coming out of a pinch: one finger may still be down, but resuming a pan
      // from its position would jump the camera by the whole gesture's travel.
      // Drop the pinch and wait for a fresh press.
      if (pinchRef.current !== null) {
        pinchRef.current = null;
        panRef.current = null;
        if (pointersRef.current.size > 0) return;
      }

      const held = dragNodeRef.current;
      if (held) {
        // Release the pin so it re-settles with everything else.
        held.fx = null;
        held.fy = null;
        if (!movedRef.current) onSelect({ id: held.id, path: held.path });
      }
      dragNodeRef.current = null;
      panRef.current = null;
    },
    [onSelect],
  );

  /* ---- wheel: pan or cursor-anchored zoom ------------------------------ */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      autoFitRef.current = false;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (isZoomIntent(e)) {
        const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0016));
        camRef.current = zoomAt(camRef.current, x, y, factor);
        camRef.current = relaxScale(camRef.current, x, y);
      } else {
        camRef.current = pan(camRef.current, -e.deltaX, -e.deltaY);
      }
      dirtyRef.current = true;
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, []);

  useGraphTestHook({
    camRef,
    simRef,
    simNodesRef,
    simLinksRef,
    width: size.width,
    height: size.height,
  });

  const fit = useCallback(() => {
    // Asking to fit is asking the camera to follow again, so it re-arms. On a
    // settled graph nothing ticks afterwards and this is a one-shot.
    autoFitRef.current = true;
    const b = boundsOf(simNodesRef.current);
    if (b && size.width > 0) {
      camRef.current = fitTo(b, size.width, Math.max(80, size.height - 52));
    }
    dirtyRef.current = true;
  }, [size.width, size.height]);

  const zoomBy = useCallback(
    (factor: number) => {
      autoFitRef.current = false;
      camRef.current = zoomAt(camRef.current, size.width / 2, size.height / 2, factor);
      camRef.current = relaxScale(camRef.current, size.width / 2, size.height / 2);
      dirtyRef.current = true;
    },
    [size.width, size.height],
  );

  return (
    <div ref={hostRef} className={className ?? "relative h-full w-full"}>
      <canvas
        ref={pulseRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
      <canvas
        ref={canvasRef}
        data-testid="graph-canvas"
        role="application"
        aria-label={`Knowledge graph, ${nodes.length} nodes`}
        className={`font-body h-full w-full touch-none ${
          hoverId ? "cursor-pointer" : "cursor-grab"
        } active:cursor-grabbing`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerLeave={() => {
          endPointer();
          hoverRef.current = null;
          dirtyRef.current = true;
          setHoverId(null);
        }}
        onDoubleClick={fit}
      />

      <CamControls
        onZoomIn={() => zoomBy(1.3)}
        onZoomOut={() => zoomBy(1 / 1.3)}
        onFit={fit}
      />
    </div>
  );
}
