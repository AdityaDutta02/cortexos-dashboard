"use client";

/**
 * The note's YAML frontmatter, as a small structured header.
 *
 * The API returns `frontmatter` already parsed alongside `content`, but
 * `content` is the raw file — fence included — so the previous renderer put
 * `--- tags: [moc, home] type: map-of-content ---` at the top of every real
 * note as prose. The fence is stripped from the body and the values are shown
 * here instead: mono keys, real values, tags as chips.
 */
export function Frontmatter({ data }: { data: Record<string, unknown> }) {
  const rows = Object.entries(data).filter(([, value]) => !isEmpty(value));
  if (rows.length === 0) return null;

  return (
    <dl
      data-testid="frontmatter"
      className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 border border-border bg-strip px-3 py-2.5"
    >
      {rows.map(([key, value]) => (
        <div key={key} className="contents">
          <dt className="t-mono text-text-dim">{key}</dt>
          <dd className="t-body-sm min-w-0 text-text">
            {Array.isArray(value) ? (
              <span className="flex flex-wrap gap-1">
                {value.map((item, i) => (
                  <span key={i} className="t-mono border border-border bg-bg px-1.5 py-px text-text-muted">
                    {stringify(item)}
                  </span>
                ))}
              </span>
            ) : (
              <span className="break-words">{stringify(value)}</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return true;
  return Array.isArray(value) && value.length === 0;
}

function stringify(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  // Nested maps are rare in this vault and unreadable as a table cell; JSON is
  // the honest fallback rather than "[object Object]".
  return JSON.stringify(value);
}

/**
 * Removes a leading YAML frontmatter fence from the raw file.
 *
 * Deliberately strict: the fence must open on line 1 and close on a line that
 * is exactly `---`. A note whose *body* starts with a thematic break is
 * therefore left alone, and `---` inside the body still renders as a rule.
 */
export function stripFrontmatter(source: string): string {
  if (!/^---[ \t]*\r?\n/.test(source)) return source;
  const lines = source.split("\n");
  for (let i = 1; i < lines.length; i += 1) {
    if (/^---[ \t]*\r?$/.test(lines[i] ?? "") || lines[i]?.trim() === "---") {
      return lines.slice(i + 1).join("\n").replace(/^\s*\n/, "");
    }
  }
  return source;
}
