import type { RelationType } from "cortexos-types";

/**
 * Canvas cannot use CSS variables, so the token values are read out of the
 * document once per theme change and handed to the renderer. This keeps the
 * graph on exactly the same palette as the rest of the app — including the
 * dark ramp — with no second source of truth.
 */
export interface Palette {
  bg: string;
  text: string;
  textMuted: string;
  textDim: string;
  border: string;
  borderStrong: string;
  blue: string;
  /** Already in the design language — not a new hue. Carries `derived-from`. */
  blueLight: string;
  ok: string;
  warn: string;
  danger: string;
  neutral: string;
  neutralTint: string;
}

const TOKENS: Record<keyof Palette, string> = {
  bg: "--color-bg",
  text: "--color-text",
  textMuted: "--color-text-muted",
  textDim: "--color-text-dim",
  border: "--color-border",
  borderStrong: "--color-border-strong",
  blue: "--color-blue",
  blueLight: "--color-blue-light",
  ok: "--color-ok",
  warn: "--color-warn",
  danger: "--color-danger",
  neutral: "--color-neutral",
  neutralTint: "--color-neutral-tint",
};

const DARK_FALLBACK: Palette = {
  bg: "#06080c",
  text: "#f0f4fa",
  textMuted: "#f0f4fac4",
  textDim: "#94a2b4",
  border: "#2a3745",
  borderStrong: "#435568",
  blue: "#4d9bff",
  blueLight: "#7ab4ff",
  ok: "#3ddc97",
  warn: "#ffc247",
  danger: "#ff6b6b",
  neutral: "#9aa8ba",
  neutralTint: "#161d27",
};

const LIGHT_FALLBACK: Palette = {
  bg: "#ffffff",
  text: "#0b1015",
  textMuted: "#0b101599",
  textDim: "#888e94",
  border: "#c5dbf2",
  borderStrong: "#9bc1ea",
  blue: "#0562ef",
  blueLight: "#1e78ff",
  ok: "#0a7d55",
  warn: "#a15c07",
  danger: "#b3261e",
  neutral: "#6b7280",
  neutralTint: "#f1f2f4",
};

/**
 * `theme` selects the fallback ramp for any token the document has not
 * resolved yet, and is also what callers key their memo on — a theme flip must
 * re-read, because every value here comes from a CSS custom property.
 */
export function readPalette(theme: "light" | "dark"): Palette {
  const fallback = theme === "dark" ? DARK_FALLBACK : LIGHT_FALLBACK;
  if (typeof window === "undefined") return fallback;
  const cs = getComputedStyle(document.documentElement);
  const out = {} as Palette;
  for (const key of Object.keys(TOKENS) as (keyof Palette)[]) {
    const value = cs.getPropertyValue(TOKENS[key]).trim();
    out[key] = value || fallback[key];
  }
  return out;
}

/**
 * Relation → edge colour. Deliberately few categories: the graph reads as
 * "mostly structure, with conflicts in red", not as a rainbow.
 */
export type RelationClass =
  | "conflict"
  | "cause"
  | "evidence"
  | "supersede"
  | "structure"
  /**
   * `derived-from` — an Insight pointing back at the subgraph it was
   * synthesised from. 200 of them on the live vault, and provenance for the
   * entire Layer-2 layer, so it does not belong in the generic structure
   * bucket: "this was derived from that" is a different claim from "this is
   * part of that".
   */
  | "derivation"
  /**
   * An untyped `[[wikilink]]` — the pipeline emits these as `references`.
   *
   * A separate class rather than a sixth flavour of structure, because the
   * distinction is the product: a coloured edge is a claim somebody made
   * (`proves`, `contradicts`), a grey one is only "this note mentions that
   * one". The vault has 233 notes with an `## Edges` section and 316 with
   * wikilinks and no edges at all, so `references` will be the *majority* of
   * lines on screen — which is exactly why it has to be the quietest.
   */
  | "reference";

/**
 * The live vault carries 69 distinct relation types, most of them inverse
 * pairs (`proves`/`proven-by`, `feeds`/`fed-by`). An edge and its inverse mean
 * the same thing, so they must share a colour — otherwise the graph looks like
 * it has twice as many kinds of relationship as it does. Everything unmatched
 * is structure, which is the honest default for a taxonomy that grows per
 * vault.
 */
export function relationClass(relation: RelationType): RelationClass {
  switch (relation) {
    case "references":
    case "referenced-by":
      return "reference";
    case "contradicts":
    case "contradicted-by":
    case "conflicts-with":
      return "conflict";
    case "causes":
    case "caused-by":
      return "cause";
    case "proves":
    case "proven-by":
    case "evidences":
      return "evidence";
    case "derived-from":
    case "derives":
      return "derivation";
    case "supersedes":
    case "superseded-by":
    case "replaces":
    case "replaced-by":
      return "supersede";
    default:
      return "structure";
  }
}

export function relationColor(p: Palette, relation: RelationType): string {
  return classColor(p, relationClass(relation));
}

/**
 * The legend's copy, kept next to the colours it describes.
 *
 * `references` is last and named for what it is. It is not "structure": the
 * whole point is that the eye can tell a stated relationship from a passing
 * mention without reading a single label.
 */
export const RELATION_LEGEND: { cls: RelationClass; label: string }[] = [
  { cls: "cause", label: "causes" },
  { cls: "evidence", label: "proves" },
  { cls: "conflict", label: "contradicts" },
  { cls: "supersede", label: "supersedes" },
  { cls: "derivation", label: "derived from" },
  { cls: "structure", label: "structure" },
  { cls: "reference", label: "mentions" },
];

/** Off by default. A typed edge is an assertion; a wikilink is a mention. */
export const DEFAULT_HIDDEN_CLASSES: RelationClass[] = ["reference"];

export function classColor(p: Palette, cls: RelationClass): string {
  switch (cls) {
    case "conflict":
      return p.danger;
    case "cause":
      return p.blue;
    case "evidence":
      return p.ok;
    case "supersede":
      return p.warn;
    case "derivation":
      return p.blueLight;
    case "reference":
      // Neutral grey, and drawn thinner and fainter than anything typed —
      // see EDGE_ALPHA / EDGE_WIDTH in draw.ts.
      return p.neutral;
    default:
      return p.border;
  }
}

/** Applies an alpha to a hex or rgb colour string for dimming. */
export function withAlpha(color: string, alpha: number): string {
  const hex = color.trim();
  if (hex.startsWith("#")) {
    const body = hex.slice(1);
    const full =
      body.length === 3
        ? body
            .split("")
            .map((c) => c + c)
            .join("")
        : body.slice(0, 6);
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    // An 8-digit source hex already carries alpha; multiply it in.
    const baseA = body.length === 8 ? parseInt(body.slice(6, 8), 16) / 255 : 1;
    return `rgba(${r}, ${g}, ${b}, ${alpha * baseA})`;
  }
  return hex;
}
