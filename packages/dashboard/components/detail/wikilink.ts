/**
 * `[[Wikilinks]]` as a remark plugin.
 *
 * Wikilinks are the vault's primary link type — a note averages a dozen and
 * almost no `[](…)` links — so they cannot stay decorative text. This turns
 * each one into a real mdast `link` node with a `wiki:` URL, which the
 * renderer then resolves against the graph.
 *
 * Doing it on the **syntax tree** rather than on the source string is the
 * whole point: text inside code spans and fenced blocks lives in `code` /
 * `inlineCode` nodes, which this never descends into, so a `[[…]]` shown as an
 * example in a code block stays literal. A regex over the raw markdown cannot
 * make that distinction, and getting that wrong is how the previous renderer
 * mangled content.
 */

interface MdastNode {
  type: string;
  value?: string;
  url?: string;
  title?: string | null;
  children?: MdastNode[];
}

/** The URL scheme wikilinks are carried on. Never a real navigable protocol. */
export const WIKI_PROTOCOL = "wiki:";

/** `[[Target|alias]]` and `[[Target#heading]]`, non-greedy, one per match. */
const WIKILINK = /\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g;

/** Nodes whose text is literal and must never be scanned for links. */
const OPAQUE = new Set(["code", "inlineCode", "link", "linkReference", "definition", "html"]);

function splitText(value: string): MdastNode[] | null {
  WIKILINK.lastIndex = 0;
  if (!WIKILINK.test(value)) return null;
  WIKILINK.lastIndex = 0;

  const out: MdastNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = WIKILINK.exec(value)) !== null) {
    if (match.index > cursor) out.push({ type: "text", value: value.slice(cursor, match.index) });
    const target = (match[1] ?? "").trim();
    const heading = match[2]?.trim();
    const alias = match[3]?.trim();
    out.push({
      type: "link",
      url: `${WIKI_PROTOCOL}${target}`,
      title: heading ? `${target} › ${heading}` : target,
      children: [{ type: "text", value: alias || (heading ? `${target} › ${heading}` : target) }],
    });
    cursor = match.index + match[0].length;
  }
  if (cursor < value.length) out.push({ type: "text", value: value.slice(cursor) });
  return out;
}

function walk(node: MdastNode): void {
  const children = node.children;
  if (!children) return;
  for (let i = 0; i < children.length; i += 1) {
    const child = children[i];
    if (!child || OPAQUE.has(child.type)) continue;
    if (child.type === "text" && typeof child.value === "string") {
      const replacement = splitText(child.value);
      if (replacement) {
        children.splice(i, 1, ...replacement);
        i += replacement.length - 1;
      }
      continue;
    }
    walk(child);
  }
}

/** Start of an edge line: `causes::`, `instance-of::`, `proven-by::`, … */
const EDGE_BREAK = /\n(?=[a-z][a-z0-9-]*::)/;

/**
 * Splits a paragraph of stacked `relation::` lines into one paragraph each.
 *
 * CommonMark joins consecutive lines into a single paragraph, which is correct
 * for prose — the vault hard-wraps, and joining is what stops a gap appearing
 * mid-sentence. But an `## Edges` block written as bare lines rather than list
 * items is a *list*: three edges became one run-on line reading
 * `causes:: A proves:: B relates-to:: C`. Splitting on the newline before an
 * edge prefix restores the rows without touching ordinary prose, which never
 * has a line starting `word::`.
 */
function splitEdgeParagraphs(node: MdastNode): void {
  const children = node.children;
  if (!children) return;
  for (let i = 0; i < children.length; i += 1) {
    const child = children[i];
    if (!child) continue;
    if (child.type !== "paragraph") {
      splitEdgeParagraphs(child);
      continue;
    }
    const groups: MdastNode[][] = [[]];
    let split = false;
    for (const part of child.children ?? []) {
      if (part.type === "text" && typeof part.value === "string" && EDGE_BREAK.test(part.value)) {
        const pieces = part.value.split(EDGE_BREAK);
        pieces.forEach((piece, index) => {
          if (index > 0) {
            groups.push([]);
            split = true;
          }
          if (piece.length > 0) groups[groups.length - 1]?.push({ type: "text", value: piece });
        });
      } else {
        groups[groups.length - 1]?.push(part);
      }
    }
    if (!split) continue;
    const paragraphs = groups
      .filter((g) => g.length > 0)
      .map<MdastNode>((g) => ({ type: "paragraph", children: g }));
    children.splice(i, 1, ...paragraphs);
    i += paragraphs.length - 1;
  }
}

/** remark plugin: `remarkPlugins={[remarkGfm, remarkVault]}`. */
export function remarkVault() {
  return (tree: MdastNode): void => {
    splitEdgeParagraphs(tree);
    walk(tree);
  };
}

/**
 * Splits `relation:: [[Target]]` off the front of a paragraph.
 *
 * This is the vault's Layer-1 edge syntax (`causes::`, `proves::`,
 * `instance-of::`, ~70 of them). It is not markdown, so a real parser leaves
 * it as ordinary paragraph text — which is correct, but it reads as noise. The
 * renderer pulls the relation out and sets it as a mono label instead.
 */
export function splitEdgePrefix(text: string): { relation: string; rest: string } | null {
  const match = /^([a-z][a-z0-9-]*)::[ \t]*/.exec(text);
  if (!match) return null;
  return { relation: match[1] ?? "", rest: text.slice(match[0].length) };
}
