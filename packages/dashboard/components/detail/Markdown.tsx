"use client";

import { isValidElement, type ReactNode } from "react";
import ReactMarkdown, { defaultUrlTransform, type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { remarkVault, splitEdgePrefix, WIKI_PROTOCOL } from "./wikilink";

/**
 * The note renderer.
 *
 * **react-markdown + remark-gfm + rehype-highlight.** The renderer this
 * replaced was hand-rolled and handled four constructs — headings, bullets,
 * wikilinks, paragraphs — passing everything else through as literal
 * characters: GFM tables arrived as a wall of `| # | Block | Time |`,
 * blockquotes as `>`, thematic breaks as `---`, and `**Arc:**` kept its
 * asterisks. A vault is arbitrary markdown, so the renderer has to be a real
 * CommonMark parser; growing the hand-rolled one is how it got this bad.
 *
 * Why this stack:
 * - **react-markdown** produces React elements from mdast directly. It never
 *   builds an HTML string, so there is no `dangerouslySetInnerHTML` anywhere
 *   in this path.
 * - **Sanitising by construction.** `rehype-raw` is deliberately *not*
 *   installed, so embedded HTML in a note is escaped and displayed, never
 *   executed. A `<script>` in a note is text. There is no allowlist to keep
 *   correct because there is no HTML pass at all.
 * - **remark-gfm** gives tables, task lists, strikethrough, autolinks and
 *   footnotes — the parts of the vault's markdown that were broken.
 * - **rehype-highlight** (lowlight/highlight.js) tokenises fenced code at
 *   render time with no build step and no async loader. Shiki produces nicer
 *   colour but ships a WASM grammar engine and wants an async init, which is a
 *   lot of bundle for code blocks in a side panel.
 * - `remarkVault` is local: `[[…]]` is not markdown, every plugin for it
 *   assumes a different resolution strategy, and the `relation::` edge syntax
 *   is this vault's alone.
 */
export function Markdown({
  source,
  onOpenLink,
  resolveLink,
}: {
  source: string;
  /** Called with a wikilink target once it has been resolved. */
  onOpenLink?: (target: string) => void;
  /**
   * Target title → whether the note exists. An unresolvable wikilink is
   * rendered as a dangling reference rather than as a link that goes nowhere:
   * real vaults are full of them and they are information, not errors.
   */
  resolveLink?: (target: string) => boolean;
}) {
  const components: Components = {
    h1: ({ children }) => <h1 className="t-title mt-5 mb-1 text-text first:mt-0">{children}</h1>,
    h2: ({ children }) => (
      <h2 className="t-subtitle mt-5 mb-1 border-b border-border pb-1.5 text-text first:mt-0">
        {children}
      </h2>
    ),
    h3: ({ children }) => <h3 className="t-body-lg mt-4 mb-0.5 font-heading font-medium text-text first:mt-0">{children}</h3>,
    h4: ({ children }) => <h4 className="t-body mt-3.5 font-heading font-medium text-text">{children}</h4>,
    h5: ({ children }) => <h5 className="eyebrow-lg mt-3.5 text-text">{children}</h5>,
    h6: ({ children }) => <h6 className="eyebrow mt-3.5 text-text-muted">{children}</h6>,

    p: ({ children }) => <EdgeAwareParagraph>{children}</EdgeAwareParagraph>,

    a: ({ href, children, title }) => {
      if (href?.startsWith(WIKI_PROTOCOL)) {
        /*
         * The URL is percent-encoded on its way through mdast → hast, so
         * `wiki:Quarterly Plan Draft` arrives as `wiki:Quarterly%20Plan%20Draft`. Decoding it is
         * not cosmetic: without it every multi-word wikilink failed to resolve
         * and rendered as dangling, while single-word ones worked — 29 of 31
         * links in one real note, all of which exist.
         */
        const target = decodeTarget(href.slice(WIKI_PROTOCOL.length));
        const exists = resolveLink ? resolveLink(target) : true;
        if (!exists) {
          return (
            <span
              data-testid="wikilink-dangling"
              title={`${target} — not a note in this vault yet`}
              className="text-text-muted underline decoration-dotted decoration-from-font underline-offset-[3px]"
            >
              {children}
            </span>
          );
        }
        return (
          <button
            type="button"
            data-testid="wikilink"
            title={title ?? target}
            onClick={() => onOpenLink?.(target)}
            className="text-blue underline decoration-blue/40 underline-offset-[3px] transition-colors hover:decoration-blue"
          >
            {children}
          </button>
        );
      }
      return (
        <a
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          className="text-blue underline decoration-blue/40 underline-offset-[3px] hover:decoration-blue"
        >
          {children}
        </a>
      );
    },

    ul: ({ children }) => <ul className="my-1.5 flex flex-col gap-1 pl-5">{children}</ul>,
    ol: ({ children }) => (
      <ol className="my-1.5 flex list-decimal flex-col gap-1 pl-5 marker:text-text-dim">{children}</ol>
    ),
    li: ({ children, className }) =>
      // GFM task list items carry their own checkbox and must not also get a
      // bullet, or every checked line renders "· ☑".
      className?.includes("task-list-item") ? (
        <li className="t-body-lg -ml-5 flex list-none items-baseline gap-2 text-text">{children}</li>
      ) : (
        <li className="t-body-lg text-text marker:text-text-dim before:absolute before:-ml-3.5 before:text-text-dim before:content-['·']">
          {children}
        </li>
      ),
    input: ({ checked, type }) =>
      type === "checkbox" ? (
        <span
          aria-hidden
          className={`mt-1.5 inline-block h-3 w-3 shrink-0 border ${
            checked ? "border-blue bg-blue" : "border-border-strong"
          }`}
        />
      ) : null,

    blockquote: ({ children }) => (
      // Nested quotes stack their own left rule, which is exactly how a
      // `> >` reply chain should read.
      <blockquote className="my-2.5 flex flex-col gap-2 border-l-2 border-blue/50 bg-blue-tint/40 py-1.5 pr-1 pl-3.5 text-text-muted">
        {children}
      </blockquote>
    ),

    hr: () => <hr className="my-5 border-0 border-t border-border" />,

    strong: ({ children }) => <strong className="font-medium text-text">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    del: ({ children }) => <del className="text-text-dim line-through">{children}</del>,

    code: ({ className, children }) =>
      // react-markdown gives fenced code a language class and inline code none;
      // the <pre> wrapper below owns the block styling either way.
      className ? (
        <code className={`${className} t-mono-lg block`}>{children}</code>
      ) : (
        <code className="t-mono-lg border border-border bg-paper px-1 py-px text-text">
          {children}
        </code>
      ),
    pre: ({ children }) => (
      <pre className="my-3 overflow-x-auto border border-border bg-paper p-3.5">{children}</pre>
    ),

    table: ({ children }) => (
      // Its own scroll container: a wide GFM table must never widen the panel.
      <div className="my-3 max-w-full overflow-x-auto border border-border">
        <table className="w-full border-collapse text-left">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-strip">{children}</thead>,
    th: ({ children }) => (
      <th className="eyebrow border-b border-border px-2.5 py-2 whitespace-nowrap text-text-muted">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="t-body-sm border-b border-border/60 px-2.5 py-2 align-top text-text">
        {children}
      </td>
    ),

    /*
     * Vault images are arbitrary local or remote paths. `next/image` needs a
     * configured loader and known dimensions, and a vault provides neither, so
     * a plain <img> is the correct element here rather than a lint exception
     * taken lazily.
     */
    img: ({ src, alt }) =>
      typeof src === "string" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt ?? ""} className="my-3 max-w-full border border-border" />
      ) : null,
  };

  return (
    <div className="t-body-lg measure flex flex-col text-text" data-testid="markdown">
      <ReactMarkdown
        /*
         * react-markdown's URL sanitiser allows http/https/mailto/tel and
         * relative paths and blanks everything else — which silently emptied
         * every `wiki:` href and turned all 31 wikilinks in a real note into
         * dead anchors. `wiki:` is added to the safe list and *nothing else*
         * is: `javascript:` and `data:` stay blanked by the default.
         */
        urlTransform={(url) =>
          url.startsWith(WIKI_PROTOCOL) ? url : defaultUrlTransform(url)
        }
        remarkPlugins={[remarkGfm, remarkVault]}
        rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={components}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}

/** Percent-decoding that survives a title containing a stray `%`. */
function decodeTarget(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * A paragraph, unless it opens with the vault's `relation::` edge syntax — in
 * which case the relation becomes a mono label and the rest stays prose.
 */
function EdgeAwareParagraph({ children }: { children?: ReactNode }) {
  const list = Array.isArray(children) ? children : [children];
  const first = list[0];
  const edge = typeof first === "string" ? splitEdgePrefix(first) : null;

  if (!edge) {
    return <p className="my-1.5 text-text">{children}</p>;
  }
  return (
    <p className="my-1.5 flex flex-wrap items-baseline gap-1.5">
      <span className="eyebrow text-blue">{edge.relation}</span>
      <span className="text-text">
        {edge.rest}
        {list.slice(1).map((child, i) =>
          isValidElement(child) ? <span key={i}>{child}</span> : child,
        )}
      </span>
    </p>
  );
}
