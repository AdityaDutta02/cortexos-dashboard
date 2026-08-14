/**
 * Node state carried by ring and colour rather than by a text list. Kept in
 * its own module so both the canvas renderer and the server-safe callers can
 * import the type without pulling in the simulation.
 */
export interface NodeFlags {
  /** In an open contradiction — red ring, pulsing. */
  conflict: Set<string>;
  /** Past its freshness window — dotted amber ring. */
  stale: Set<string>;
  /** Written by a recent run — blue halo. */
  fresh: Set<string>;
}

export const NO_FLAGS: NodeFlags = {
  conflict: new Set(),
  stale: new Set(),
  fresh: new Set(),
};
