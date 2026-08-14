/**
 * Camera for the graph canvas: a pan offset plus a uniform scale.
 *
 * World coordinates come from the simulation and are unbounded. Screen
 * coordinates are CSS pixels inside the canvas. Everything the pointer does is
 * expressed here so the render and hit-test always agree.
 */

export interface Camera {
  /** Screen-space translation, applied after scaling. */
  x: number;
  y: number;
  scale: number;
}

export const MIN_SCALE = 0.12;
export const MAX_SCALE = 6;

export const IDENTITY: Camera = { x: 0, y: 0, scale: 1 };

export function worldToScreen(cam: Camera, wx: number, wy: number): [number, number] {
  return [wx * cam.scale + cam.x, wy * cam.scale + cam.y];
}

export function screenToWorld(cam: Camera, sx: number, sy: number): [number, number] {
  return [(sx - cam.x) / cam.scale, (sy - cam.y) / cam.scale];
}

/**
 * Zoom by `factor` while keeping the world point under (sx, sy) pinned to that
 * same screen pixel.
 *
 * This is the part that makes zoom feel right and the part most often got
 * wrong: scaling about the viewport centre makes the cursor drift away from
 * whatever the user was aiming at.
 *
 * Near the limits the factor is damped rather than clamped hard, so the
 * gesture eases to a stop instead of snapping.
 */
export function zoomAt(cam: Camera, sx: number, sy: number, factor: number): Camera {
  const target = cam.scale * factor;

  let next = target;
  if (target > MAX_SCALE) {
    // Ease the overshoot to zero as we approach the ceiling.
    const over = target / MAX_SCALE;
    next = MAX_SCALE * (1 + Math.log(over) * 0.08);
    next = Math.min(next, MAX_SCALE * 1.05);
  } else if (target < MIN_SCALE) {
    const under = MIN_SCALE / target;
    next = MIN_SCALE / (1 + Math.log(under) * 0.08);
    next = Math.max(next, MIN_SCALE * 0.95);
  }
  next = Math.min(MAX_SCALE * 1.05, Math.max(MIN_SCALE * 0.95, next));

  // Solve for the translation that keeps (wx, wy) under the cursor.
  const [wx, wy] = screenToWorld(cam, sx, sy);
  return { scale: next, x: sx - wx * next, y: sy - wy * next };
}

/** Settles the camera back inside the hard limits after a damped overshoot. */
export function relaxScale(cam: Camera, sx: number, sy: number): Camera {
  const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, cam.scale));
  if (clamped === cam.scale) return cam;
  const [wx, wy] = screenToWorld(cam, sx, sy);
  return { scale: clamped, x: sx - wx * clamped, y: sy - wy * clamped };
}

export function pan(cam: Camera, dx: number, dy: number): Camera {
  return { ...cam, x: cam.x + dx, y: cam.y + dy };
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function boundsOf(points: { x?: number; y?: number }[]): Bounds | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x === undefined || p.y === undefined) continue;
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  if (!Number.isFinite(minX)) return null;
  return { minX, minY, maxX, maxY };
}

/** The camera that frames `bounds` inside a `width`×`height` viewport. */
export function fitTo(
  bounds: Bounds,
  width: number,
  height: number,
  padding = 56,
): Camera {
  const w = Math.max(1, bounds.maxX - bounds.minX);
  const h = Math.max(1, bounds.maxY - bounds.minY);
  const scale = Math.min(
    MAX_SCALE,
    Math.max(MIN_SCALE, Math.min((width - padding * 2) / w, (height - padding * 2) / h)),
  );
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;
  return { scale, x: width / 2 - cx * scale, y: height / 2 - cy * scale };
}

/**
 * Does this wheel event mean zoom, or pan?
 *
 * A pinch on a mac trackpad arrives as a wheel event with ctrlKey set — that
 * is unambiguous. A discrete mouse wheel arrives as a large, usually integral
 * deltaY with no deltaX. Everything else is a two-finger scroll, which pans.
 */
export function isZoomIntent(e: WheelEvent): boolean {
  if (e.ctrlKey || e.metaKey) return true;
  if (e.deltaMode !== 0) return true; // line/page mode: a real wheel
  return e.deltaX === 0 && Math.abs(e.deltaY) >= 40 && Number.isInteger(e.deltaY);
}
