"use client";

import type { Note } from "cortexos-types";
import { ds } from "@/lib/data";
import { useAsync } from "@/lib/use-async";
import { ErrorState, RelativeTime, SkeletonLines, TierBadge } from "@/components/ui";
import { Frontmatter, stripFrontmatter } from "@/components/detail/Frontmatter";
import { Markdown } from "@/components/detail/Markdown";

/** A vault note. The original detail view, now one content kind among many. */
export function NotePanel({
  path,
  onOpenLink,
  resolveLink,
}: {
  path: string;
  /** Wikilink target → the vault path the workspace resolved it to. */
  onOpenLink: (target: string) => void;
  /** True when the target is a real note. Dangling links render differently. */
  resolveLink?: (target: string) => boolean;
}) {
  const { data, loading, error, reload } = useAsync<Note>(() => ds.readNote(path), [path]);

  if (loading) return <SkeletonLines rows={8} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <article className="flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <TierBadge tier={data.tier} />
        <RelativeTime iso={data.updatedAt} className="t-mono" />
      </div>

      <Frontmatter data={data.frontmatter} />

      {/* The API parses frontmatter for us but returns `content` raw, so the
          fence has to come off the body or it renders as prose. */}
      <Markdown
        source={stripFrontmatter(data.content)}
        onOpenLink={onOpenLink}
        resolveLink={resolveLink}
      />
    </article>
  );
}
