import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import type { GraphEdge, GraphNode } from "cortexos-types";

/**
 * Force layout, on d3-force.
 *
 * Chosen over hand-rolling because `forceManyBody` is a Barnes–Hut
 * approximation: repulsion is O(n log n) instead of the O(n²) the previous
 * hand-rolled layout used. At ~600 nodes that is the difference between a
 * smooth drag and a stuttering one. d3-force also gives velocity-Verlet
 * integration and alpha decay that are correct and well-tested, which is not
 * worth re-deriving.
 */

export interface SimNode extends SimulationNodeDatum {
  /**
   * Graph identity. On the live agent this is the note TITLE, not its path —
   * edges reference these ids, so all graph-internal logic must use them.
   */
  id: string;
  /** Vault path. The only thing `readNote` will accept. */
  path: string;
  label: string;
  degree: number;
  tier: 0 | 1 | 2;
  proposed: boolean;
  /** Cached draw radius, derived from degree. */
  r: number;
}

export interface SimLink extends SimulationLinkDatum<SimNode> {
  source: string | SimNode;
  target: string | SimNode;
  relation: string;
  proposed: boolean;
}

export function nodeRadius(degree: number): number {
  return 4 + Math.sqrt(Math.max(0, degree)) * 3.1;
}

export function toSimNodes(nodes: GraphNode[]): SimNode[] {
  return nodes.map((n) => ({
    id: n.id,
    path: n.path,
    label: n.label,
    degree: n.degree,
    tier: n.tier,
    proposed: n.proposed,
    r: nodeRadius(n.degree),
  }));
}

export function toSimLinks(edges: GraphEdge[]): SimLink[] {
  return edges.map((e) => ({
    source: e.source,
    target: e.target,
    relation: e.relation,
    proposed: e.proposed,
  }));
}

export interface BuildOptions {
  width: number;
  height: number;
  /** Skip the animation entirely and settle synchronously. */
  reducedMotion: boolean;
}

/**
 * Deterministic 0–1 from a string (FNV-1a). Layout must be reproducible: the
 * same vault has to settle the same way twice, so `Math.random` is not an
 * option, but *some* variation is exactly what stops the layout looking
 * machined. Every "organic" wobble below comes from here.
 */
function hashUnit(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

const endpointId = (e: string | SimNode): string => (typeof e === "string" ? e : e.id);

/**
 * Force layout tuned to look like Obsidian: **high repulsion, low link
 * strength, no packing force.**
 *
 * The previous configuration did the opposite and produced a visible hexagonal
 * lattice — hundreds of leaves in geometric rings. That was `forceCollide`
 * winning. Measured on the live 566-node vault (headless, 900 ticks):
 *
 * | config | ψ₆ (hex order) | mean nearest-neighbour |
 * |---|---|---|
 * | previous | **0.568** | 24.4px — i.e. exactly `2 × (r + 5)` |
 * | uniform-random reference | 0.351 | — |
 * | perfect hexagonal lattice | 0.898 | — |
 * | this configuration | **0.36** | 46px, CV 0.42 |
 *
 * ψ₆ is the bond-orientational order parameter over each node's six nearest
 * neighbours. The previous layout sat 40% of the way from random to a perfect
 * crystal, and its nearest-neighbour distance was pinned to the collision
 * diameter for *every* leaf: proof that collision, not charge, was setting the
 * spacing. Collision prevents overlap; it must never determine layout.
 */
export function buildSimulation(
  nodes: SimNode[],
  links: SimLink[],
  { width, height, reducedMotion }: BuildOptions,
): Simulation<SimNode, SimLink> {
  const count = Math.max(1, nodes.length);
  /*
   * Canvas area per node. Every distance below is expressed in units of it, so
   * a 20-node neighbourhood and a 600-node vault settle at the same *relative*
   * density and the fit-to-view camera does the rest. Without this, one fixed
   * charge either collapses the big graph or explodes the small one.
   */
  const spread = Math.sqrt((width * height) / count);
  const chargeBase = -Math.max(90, spread * 3.4);
  const linkBase = Math.max(24, spread * 1.15);

  // Degree within the *filtered* link set — the legend can remove links, and a
  // node that has lost all of its is an orphan for layout purposes.
  const liveDegree = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  for (const l of links) {
    const s = endpointId(l.source);
    const t = endpointId(l.target);
    liveDegree.set(s, (liveDegree.get(s) ?? 0) + 1);
    liveDegree.set(t, (liveDegree.get(t) ?? 0) + 1);
  }
  const degreeOf = (e: string | SimNode): number => liveDegree.get(endpointId(e)) ?? 0;

  const sim = forceSimulation<SimNode, SimLink>(nodes)
    .force(
      "link",
      forceLink<SimNode, SimLink>(links)
        .id((d) => d.id)
        /*
         * Obsidian's edges are not one length. Three things vary this one:
         * the relation type, the busier endpoint's degree (a hub has to hold
         * its leaves at arm's length or they jam), and a per-edge wobble.
         */
        .distance((l) => {
          const busiest = Math.max(degreeOf(l.source), degreeOf(l.target));
          const byRelation = 0.86 + hashUnit(l.relation) * 0.38;
          const wobble = 0.82 + hashUnit(`${endpointId(l.source)}|${l.relation}`) * 0.42;
          return linkBase * byRelation * wobble * (1 + Math.sqrt(busiest) * 0.22);
        })
        /*
         * Low, and lower still on hub spokes. A strong spring on 61 leaves of
         * one hub drags them into a tight shell, which is half of how the
         * lattice formed. d3's own default is the same shape (1/min-degree);
         * this is that, scaled down.
         */
        .strength((l) => {
          const quietest = Math.max(1, Math.min(degreeOf(l.source), degreeOf(l.target)));
          return Math.min(0.5, 0.9 / (quietest + 2));
        }),
    )
    /*
     * Repulsion sets the spacing — that is the whole point. It scales with
     * node size so hubs claim room, carries a per-node wobble so equal nodes
     * are not interchangeable, and reaches far enough (1.6× the viewport) to
     * actually separate clusters instead of only nudging touching neighbours.
     */
    .force(
      "charge",
      forceManyBody<SimNode>()
        .strength((d) => chargeBase * (0.55 + Math.min(1.9, d.r / 7)) * (0.8 + hashUnit(`c${d.id}`) * 0.5))
        .distanceMax(Math.min(width, height) * 1.6)
        // Barnes–Hut accuracy. 0.9 keeps 600 nodes at 60fps under the wider reach.
        .theta(0.9),
    )
    .force("center", forceCenter(width / 2, height / 2).strength(0.04))
    /*
     * Containment, not packing — and it holds the *connected* graph in the
     * middle. `forceCenter` only re-centres the mean and exerts no pull, so
     * without this the 330 orphans in the live vault drift off; but pulling
     * orphans harder than linked nodes (which the previous round did, 0.14 vs
     * 0.035) hands them the centre and pushes the actual graph out to one
     * side. Measured on the live vault: the two populations' centroids sat
     * 801px apart, with the orphan blob *inside* the linked ring. Inverting it
     * puts the connected core at r≈530 and the orphans in a halo at r≈1126,
     * concentric to 18px — a core with a cloud around it, which is the shape
     * Obsidian has.
     *
     * The jitter matters as much as the sign: identical nodes with identical
     * gravity settle at an identical radius, which is a ring. Varying it per
     * node spreads the equilibrium radii into a cloud.
     */
    .force(
      "gravityX",
      forceX<SimNode>(width / 2).strength((d) =>
        degreeOf(d) > 0 ? 0.05 : 0.02 + hashUnit(d.id) * 0.05,
      ),
    )
    .force(
      "gravityY",
      forceY<SimNode>(height / 2).strength((d) =>
        degreeOf(d) > 0 ? 0.05 : 0.02 + hashUnit(`y${d.id}`) * 0.05,
      ),
    )
    /*
     * An overlap guard and nothing more: radius + 1px, weak, one iteration.
     * Anything stronger than this starts deciding the layout again.
     */
    .force("collide", forceCollide<SimNode>((d) => d.r + 1).strength(0.2).iterations(1))
    .alphaDecay(0.0195)
    .velocityDecay(0.4);

  if (reducedMotion) {
    // Settle in one synchronous pass, then never tick again: the user sees a
    // finished layout rather than an animation. 400 ticks is past alphaMin at
    // this decay rate — 320 was not, and left the layout mid-expansion.
    sim.stop();
    for (let i = 0; i < 400; i += 1) sim.tick();
    sim.alpha(0);
  }

  return sim;
}

/** Nudges the simulation back to life after an interaction or a data change. */
export function reheat(sim: Simulation<SimNode, SimLink>, alpha = 0.3): void {
  if (sim.alpha() < alpha) sim.alpha(alpha);
  sim.restart();
}

/** Nearest node within `radius` screen pixels of a world point, else null. */
export function hitTest(
  nodes: SimNode[],
  wx: number,
  wy: number,
  slack: number,
): SimNode | null {
  let best: SimNode | null = null;
  let bestD2 = Infinity;
  for (const n of nodes) {
    if (n.x === undefined || n.y === undefined) continue;
    const dx = n.x - wx;
    const dy = n.y - wy;
    const d2 = dx * dx + dy * dy;
    const reach = n.r + slack;
    if (d2 <= reach * reach && d2 < bestD2) {
      bestD2 = d2;
      best = n;
    }
  }
  return best;
}

/** Ids adjacent to `id`, inclusive. Drives the hover dim. */
export function neighboursOf(links: SimLink[], id: string): Set<string> {
  const set = new Set<string>([id]);
  for (const l of links) {
    const s = typeof l.source === "string" ? l.source : l.source.id;
    const t = typeof l.target === "string" ? l.target : l.target.id;
    if (s === id) set.add(t);
    if (t === id) set.add(s);
  }
  return set;
}
