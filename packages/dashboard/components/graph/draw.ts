import type { Camera } from "@/lib/graph-camera";
import { worldToScreen } from "@/lib/graph-camera";
import type { NodeFlags } from "./flags";
import { classColor, relationClass, withAlpha, type Palette } from "./palette";
import type { SimLink, SimNode } from "./simulation";

/** Labels stay hidden below this zoom, so a far view is shape, not text. */
export const LABEL_ZOOM = 0.75;
/** Between these, only the heaviest nodes are labelled. */
export const LABEL_ALL_ZOOM = 1.35;

export interface DrawState {
  nodes: SimNode[];
  links: SimLink[];
  camera: Camera;
  palette: Palette;
  flags: NodeFlags;
  /** Node ids to keep bright; everything else dims. Null = no focus. */
  focusSet: Set<string> | null;
  hoverId: string | null;
  selectedId: string | null;
  width: number;
  height: number;
  /** 0..1, drives the conflict ring pulse. */
  pulse: number;
  /**
   * A resolved font-family string. Canvas cannot parse `var(--font-dm-sans)` —
   * assigning it silently leaves the default 10px sans-serif — so the caller
   * resolves the CSS variable and passes the real family list.
   */
  fontFamily: string;
}

const DIM = 0.13;

/** Never smaller than this on screen, or a far-out node vanishes entirely. */
const MIN_SCREEN_RADIUS = 1.7;
/** Never larger than this multiple, or a hub swallows the viewport when zoomed. */
const MAX_RADIUS_SCALE = 1.9;

/**
 * A node's radius in screen pixels.
 *
 * This tracks the camera **1:1** and only floors at a minimum pixel size. It
 * used to floor the *scale* at 0.55×, which was invisible while a whole vault
 * fitted at ~0.85× and became the dominant visual bug once the force rebalance
 * made it fit at ~0.30×: positions shrank by 0.30 and radii by 0.55, so every
 * node was drawn 1.8× too large for its spacing and the graph read as one
 * overlapping blob with beaded chains hanging off the hubs. Radius and
 * position must shrink together — that ratio *is* the density of the graph.
 */
export function screenRadius(r: number, scale: number): number {
  return Math.max(MIN_SCREEN_RADIUS, r * Math.min(MAX_RADIUS_SCALE, scale));
}

const CLASSES = [
  "conflict",
  "cause",
  "evidence",
  "supersede",
  "derivation",
  "structure",
  "reference",
] as const;
const CLASS_INDEX: Record<string, number> = {
  conflict: 0,
  cause: 1,
  evidence: 2,
  supersede: 3,
  derivation: 4,
  structure: 5,
  reference: 6,
};

/**
 * Opacity and line width per class, when lit.
 *
 * `reference` is deliberately the faintest and thinnest thing on the canvas:
 * a hairline at 0.16 opacity. Untyped wikilinks outnumber typed edges 1,694 to
 * 1,286 on the live vault and the busiest node pulls 264 of them, so drawing
 * them at structure weight buries every coloured edge under grey — which is
 * precisely the "the structure is fucked, it's just noise" verdict the first
 * full-link render earned. Turned on, they have to read as *texture behind
 * structure*, never as competing structure.
 */
const EDGE_ALPHA: Record<(typeof CLASSES)[number], number> = {
  conflict: 0.9,
  cause: 0.5,
  evidence: 0.5,
  supersede: 0.5,
  derivation: 0.5,
  structure: 0.5,
  reference: 0.16,
};

const EDGE_WIDTH: Record<(typeof CLASSES)[number], number> = {
  conflict: 1.6,
  cause: 1,
  evidence: 1,
  supersede: 1,
  derivation: 1,
  structure: 1,
  reference: 0.5,
};

/*
 * Draw buffers, allocated once and reused every frame.
 *
 * This matters more than it looks. An earlier version built Map keys and
 * pushed into fresh arrays per edge; at 600 nodes that allocation churn cost
 * more than the canvas state changes it was trying to avoid, and halved the
 * frame rate. Nothing in the render path allocates now.
 */
const EDGE_BUCKETS = CLASSES.length * 2 * 2; // class × lit × proposed
const edgeSegments: number[][] = Array.from({ length: EDGE_BUCKETS }, () => []);
const edgeCounts = new Int32Array(EDGE_BUCKETS);
const edgeColors: string[] = new Array(EDGE_BUCKETS).fill("");

const NODE_FILL_BUCKETS = 4 * 2; // (tier 0/1/2 + proposed) × lit
const nodeFills: number[][] = Array.from({ length: NODE_FILL_BUCKETS }, () => []);
const nodeFillCounts = new Int32Array(NODE_FILL_BUCKETS);
const nodeFillColors: string[] = new Array(NODE_FILL_BUCKETS).fill("");

const NODE_STROKE_BUCKETS = 4 * 2; // (conflict|stale|emphasis|normal) × lit
const nodeStrokes: number[][] = Array.from({ length: NODE_STROKE_BUCKETS }, () => []);
const nodeStrokeCounts = new Int32Array(NODE_STROKE_BUCKETS);
const nodeStrokeColors: string[] = new Array(NODE_STROKE_BUCKETS).fill("");

const DASH_NONE: number[] = [];
const DASH_PROPOSED = [3, 3];
const DASH_STALE = [2, 3];
const DASH_EDGE = [4, 4];

function push4(buf: number[], at: number, a: number, b: number, c: number, d: number): void {
  buf[at] = a;
  buf[at + 1] = b;
  buf[at + 2] = c;
  buf[at + 3] = d;
}

export function draw(ctx: CanvasRenderingContext2D, s: DrawState): void {
  const { camera: cam, palette: p, width, height } = s;

  ctx.clearRect(0, 0, width, height);

  const margin = 120;
  const visible = (x: number, y: number) =>
    x > -margin && x < width + margin && y > -margin && y < height + margin;

  /* ---- style tables: built once per frame, not once per item ---------- */
  for (let c = 0; c < CLASSES.length; c += 1) {
    const cls = CLASSES[c] as (typeof CLASSES)[number];
    const base = classColor(p, cls);
    const litAlpha = EDGE_ALPHA[cls];
    // Dimmed, a reference has to stay below the typed edges it sits among,
    // or hover-dimming re-flattens the hierarchy the lit state establishes.
    const dimAlpha = cls === "reference" ? DIM * 0.6 : DIM;
    for (let lit = 0; lit < 2; lit += 1) {
      const color = withAlpha(base, lit ? litAlpha : dimAlpha);
      edgeColors[(c * 2 + lit) * 2] = color;
      edgeColors[(c * 2 + lit) * 2 + 1] = color;
    }
  }
  const fillBase = [p.neutralTint, p.borderStrong, p.blue, p.bg];
  for (let k = 0; k < 4; k += 1) {
    for (let lit = 0; lit < 2; lit += 1) {
      nodeFillColors[k * 2 + lit] = withAlpha(fillBase[k] as string, lit ? 1 : DIM);
    }
  }
  const strokeBase = [p.danger, p.warn, p.text, p.borderStrong];
  for (let k = 0; k < 4; k += 1) {
    for (let lit = 0; lit < 2; lit += 1) {
      nodeStrokeColors[k * 2 + lit] = withAlpha(strokeBase[k] as string, lit ? 1 : DIM);
    }
  }

  edgeCounts.fill(0);
  nodeFillCounts.fill(0);
  nodeStrokeCounts.fill(0);

  /* ---- edges ----------------------------------------------------------- */
  const widthScale = Math.min(1.6, Math.max(0.6, cam.scale));

  for (const l of s.links) {
    const a = l.source as SimNode;
    const b = l.target as SimNode;
    if (a.x === undefined || b.x === undefined) continue;
    const [ax, ay] = worldToScreen(cam, a.x, a.y ?? 0);
    const [bx, by] = worldToScreen(cam, b.x, b.y ?? 0);
    if (!visible(ax, ay) && !visible(bx, by)) continue;

    const lit = !s.focusSet || (s.focusSet.has(a.id) && s.focusSet.has(b.id)) ? 1 : 0;
    const c = CLASS_INDEX[relationClass(l.relation)] ?? CLASS_INDEX.structure ?? 0;
    const bucket = (c * 2 + lit) * 2 + (l.proposed ? 1 : 0);
    const at = edgeCounts[bucket] as number;
    push4(edgeSegments[bucket] as number[], at, ax, ay, bx, by);
    edgeCounts[bucket] = at + 4;
  }

  for (let bucket = 0; bucket < EDGE_BUCKETS; bucket += 1) {
    const count = edgeCounts[bucket] as number;
    if (count === 0) continue;
    const seg = edgeSegments[bucket] as number[];
    ctx.strokeStyle = edgeColors[bucket] as string;
    // `bucket = (class * 2 + lit) * 2 + proposed`, so the class is bucket >> 2.
    ctx.lineWidth =
      (EDGE_WIDTH[CLASSES[bucket >> 2] as (typeof CLASSES)[number]] ?? 1) * widthScale;
    ctx.setLineDash(bucket % 2 === 1 ? DASH_EDGE : DASH_NONE);
    ctx.beginPath();
    for (let i = 0; i < count; i += 4) {
      ctx.moveTo(seg[i] as number, seg[i + 1] as number);
      ctx.lineTo(seg[i + 2] as number, seg[i + 3] as number);
    }
    ctx.stroke();
  }
  ctx.setLineDash(DASH_NONE);

  /* ---- nodes ----------------------------------------------------------- */
  for (const n of s.nodes) {
    if (n.x === undefined || n.y === undefined) continue;
    const [x, y] = worldToScreen(cam, n.x, n.y);
    const r = screenRadius(n.r, cam.scale);
    if (!visible(x, y)) continue;

    const lit = !s.focusSet || s.focusSet.has(n.id) ? 1 : 0;
    const selected = s.selectedId === n.id;
    const hovered = s.hoverId === n.id;
    const conflict = s.flags.conflict.has(n.id);
    const stale = s.flags.stale.has(n.id);

    if (s.flags.fresh.has(n.id) && lit) {
      ctx.fillStyle = withAlpha(p.blue, 0.16);
      ctx.beginPath();
      ctx.arc(x, y, r + 7, 0, Math.PI * 2);
      ctx.fill();
    }

    // `proposed` nodes are hollow — searchable, excluded from reasoning (§6.2).
    const fillKind = n.proposed ? 3 : n.tier;
    const fb = fillKind * 2 + lit;
    const fAt = nodeFillCounts[fb] as number;
    const fArr = nodeFills[fb] as number[];
    fArr[fAt] = x;
    fArr[fAt + 1] = y;
    fArr[fAt + 2] = r;
    nodeFillCounts[fb] = fAt + 3;

    // Selection and hover are drawn immediately: at most two per frame, and
    // they need a width the shared buckets do not carry.
    if (selected || hovered) {
      ctx.strokeStyle = nodeStrokeColors[2 * 2 + lit] as string;
      ctx.lineWidth = selected ? 3 : 2;
      ctx.setLineDash(n.proposed ? DASH_PROPOSED : DASH_NONE);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash(DASH_NONE);
      continue;
    }

    const strokeKind = conflict ? 0 : stale ? 1 : 3;
    const sb = strokeKind * 2 + lit;
    const sAt = nodeStrokeCounts[sb] as number;
    const sArr = nodeStrokes[sb] as number[];
    sArr[sAt] = x;
    sArr[sAt + 1] = y;
    sArr[sAt + 2] = n.proposed ? -r : r; // sign carries "proposed", so dashes bucket too
    nodeStrokeCounts[sb] = sAt + 3;
  }

  for (let b = 0; b < NODE_FILL_BUCKETS; b += 1) {
    const count = nodeFillCounts[b] as number;
    if (count === 0) continue;
    const arr = nodeFills[b] as number[];
    ctx.fillStyle = nodeFillColors[b] as string;
    ctx.beginPath();
    for (let i = 0; i < count; i += 3) {
      const x = arr[i] as number;
      const y = arr[i + 1] as number;
      const r = arr[i + 2] as number;
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, Math.PI * 2);
    }
    ctx.fill();
  }

  for (let b = 0; b < NODE_STROKE_BUCKETS; b += 1) {
    const count = nodeStrokeCounts[b] as number;
    if (count === 0) continue;
    const arr = nodeStrokes[b] as number[];
    const kind = b >> 1;
    // Two passes so proposed (negative radius) gets its dash without a bucket.
    for (let pass = 0; pass < 2; pass += 1) {
      ctx.strokeStyle = nodeStrokeColors[b] as string;
      ctx.lineWidth = kind === 0 || pass === 1 ? 2 : 1;
      ctx.setLineDash(pass === 1 ? DASH_PROPOSED : kind === 1 ? DASH_STALE : DASH_NONE);
      ctx.beginPath();
      let any = false;
      for (let i = 0; i < count; i += 3) {
        const r = arr[i + 2] as number;
        if (pass === 1 ? r >= 0 : r < 0) continue;
        const x = arr[i] as number;
        const y = arr[i + 1] as number;
        const rr = Math.abs(r);
        ctx.moveTo(x + rr, y);
        ctx.arc(x, y, rr, 0, Math.PI * 2);
        any = true;
      }
      if (any) ctx.stroke();
    }
  }
  ctx.setLineDash(DASH_NONE);

  /* ---- labels ---------------------------------------------------------- */
  const showAny = cam.scale >= LABEL_ZOOM;
  const showAll = cam.scale >= LABEL_ALL_ZOOM;
  const threshold = showAll ? -1 : topDegreeThreshold(s.nodes, 12);
  /*
   * A whole-vault graph now fits at ~0.30×, below LABEL_ZOOM, so a pure
   * scale test would leave the first view completely unlabelled. A node that
   * is physically large on screen is legible regardless of zoom, so the
   * heaviest hubs keep their label at fit — which is the one thing you want
   * named when you are looking at the shape of the whole vault.
   */
  const bigRadius = 9;
  if (!showAny && !s.hoverId && !s.selectedId && threshold <= 0) return;

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = `500 12px ${s.fontFamily}`;

  for (const n of s.nodes) {
    if (n.x === undefined || n.y === undefined) continue;
    const always = s.hoverId === n.id || s.selectedId === n.id;
    const r = screenRadius(n.r, cam.scale);
    if (!always) {
      if (!showAny && !(r >= bigRadius && n.degree >= threshold)) continue;
      if (!showAll && n.degree < threshold) continue;
      if (s.focusSet && !s.focusSet.has(n.id)) continue;
    }
    const [x, y] = worldToScreen(cam, n.x, n.y);
    if (!visible(x, y)) continue;

    const w = ctx.measureText(n.label).width;
    ctx.fillStyle = withAlpha(p.bg, always ? 0.92 : 0.78);
    ctx.fillRect(x - w / 2 - 3, y + r + 3, w + 6, 15);
    ctx.fillStyle = always ? p.text : p.textMuted;
    ctx.fillText(n.label, x, y + r + 4);
  }
}

/** Degree of the `keep`-th heaviest node — the cut for mid-zoom labelling. */
let cachedNodes: SimNode[] | null = null;
let cachedKeep = -1;
let cachedThreshold = 0;

function topDegreeThreshold(nodes: SimNode[], keep: number): number {
  // Sorting every frame is wasteful; the node set changes rarely.
  if (cachedNodes === nodes && cachedKeep === keep) return cachedThreshold;
  cachedNodes = nodes;
  cachedKeep = keep;
  if (nodes.length <= keep) {
    cachedThreshold = 0;
    return 0;
  }
  const degrees = nodes.map((n) => n.degree).sort((a, b) => b - a);
  cachedThreshold = degrees[keep - 1] ?? 0;
  return cachedThreshold;
}

/**
 * The animated conflict rings, drawn on a separate overlay canvas.
 *
 * They are the only thing that changes on a settled graph. Keeping them off
 * the base layer means the expensive layer repaints only when the simulation,
 * camera or hover actually change — a settled graph costs nothing.
 */
export function drawPulse(ctx: CanvasRenderingContext2D, s: DrawState): void {
  const { camera: cam, palette: p, width, height } = s;
  ctx.clearRect(0, 0, width, height);
  if (s.flags.conflict.size === 0) return;

  ctx.strokeStyle = withAlpha(p.danger, (1 - s.pulse) * 0.5);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  let any = false;
  for (const n of s.nodes) {
    if (n.x === undefined || n.y === undefined) continue;
    if (!s.flags.conflict.has(n.id)) continue;
    if (s.focusSet && !s.focusSet.has(n.id)) continue;
    const [x, y] = worldToScreen(cam, n.x, n.y);
    if (x < -80 || x > width + 80 || y < -80 || y > height + 80) continue;
    const rr = screenRadius(n.r, cam.scale) + 3 + s.pulse * 13;
    ctx.moveTo(x + rr, y);
    ctx.arc(x, y, rr, 0, Math.PI * 2);
    any = true;
  }
  if (any) ctx.stroke();
}
