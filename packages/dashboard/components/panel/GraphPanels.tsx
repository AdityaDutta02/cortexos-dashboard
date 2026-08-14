"use client";

import type { Contradiction, GraphAudit, NoteRef, SystemHealth } from "cortexos-types";
import { formatBytes, formatPct, titleFromPath } from "@/lib/format";
import { Button, DotBullet, RelativeTime, TierBadge } from "@/components/ui";

/**
 * The two conflicting statements, side by side.
 *
 * This is the piece that was lost when the decision list came off the home
 * screen: a red ring says *that* two things disagree, and only this says what
 * they actually claim. Spec §6 — surface the conflict, never pick a winner,
 * so neither side is styled as the correct one.
 */
export function ContradictionPanel({
  contradiction,
  resolvePath,
  onOpenNote,
}: {
  contradiction: Contradiction;
  /**
   * Title → path, for the case where the agent sent no `pathA`/`pathB`.
   * `nodeA`/`nodeB` are ids and must never reach `readNote` themselves.
   */
  resolvePath: (idOrTitle: string) => string | null;
  onOpenNote: (path: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="t-body-sm text-text-muted">
        These two disagree. CORTEX will not pick a winner — that is yours.
      </p>
      <Side
        node={contradiction.nodeA}
        path={contradiction.pathA}
        statement={contradiction.statementA}
        resolvePath={resolvePath}
        onOpenNote={onOpenNote}
      />

      <div className="flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-border" />
        <span className="t-mono text-danger">versus</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <Side
        node={contradiction.nodeB}
        path={contradiction.pathB}
        statement={contradiction.statementB}
        resolvePath={resolvePath}
        onOpenNote={onOpenNote}
      />

      {contradiction.resolutionNote ? (
        <p className="t-body-sm border-l-2 border-ok bg-ok-tint px-3 py-2.5 text-text">
          {contradiction.resolutionNote}
        </p>
      ) : null}
    </div>
  );
}

/**
 * One side of the conflict.
 *
 * **`node` is a title; `path` is the file.** Passing the title to `readNote`
 * is what produced "NOT FOUND — no note at Forge Is Directing AI Like A Team"
 * for a note sitting at `Insights/Forge Is Directing AI Like A Team.md`.
 * `pathA`/`pathB` are read first, the note index second, and if neither
 * answers the title renders as text — no button that is going to 404.
 */
function Side({
  node,
  path,
  statement,
  resolvePath,
  onOpenNote,
}: {
  node: string;
  path: string;
  statement: string;
  resolvePath: (idOrTitle: string) => string | null;
  onOpenNote: (path: string) => void;
}) {
  const text = statement.trim();
  const target = path.trim().length > 0 ? path : resolvePath(node);
  const label = target ? titleFromPath(target) : node;

  return (
    <div className="border border-border bg-paper p-3.5">
      {text ? (
        <p className="t-body-lg text-text">{text}</p>
      ) : (
        // Real extractions frequently carry the node pair without the claim
        // text. Say that, rather than showing an empty box.
        <p className="t-body-lg text-text-muted">
          CORTEX flagged this note as conflicting but did not record the claim. Open it to see
          what it says.
        </p>
      )}
      {target ? (
        <button
          type="button"
          onClick={() => onOpenNote(target)}
          title={target}
          className="t-mono mt-2.5 text-blue underline underline-offset-2"
        >
          {label}
        </button>
      ) : (
        <p className="t-mono mt-2.5 text-text-dim" title="No file in this vault answers to that name">
          {label} — no file found
        </p>
      )}
    </div>
  );
}

/**
 * Every open contradiction, in one list.
 *
 * The rail shows a few and sends the rest here — the same "when it does not
 * fit, hand it to the panel" rule the rest of the app follows, and the reason
 * the Contradictions module cannot grow until it squeezes Insights to 26px.
 */
export function ContradictionListPanel({
  contradictions,
  onOpen,
}: {
  contradictions: Contradiction[];
  onOpen: (id: string) => void;
}) {
  return (
    <ul className="flex flex-col" data-testid="contradiction-panel-list">
      {contradictions.map((c) => (
        <li key={c.id}>
          <button
            type="button"
            onClick={() => onOpen(c.id)}
            className="flex w-full flex-col gap-1 border-b border-border/60 py-3 text-left transition-colors hover:bg-blue-tint"
          >
            <span className="t-body flex items-center gap-2.5 text-text">
              <DotBullet tone="danger" />
              <span className="min-w-0 flex-1">
                {c.nodeA} <span className="text-danger">⇄</span> {c.nodeB}
              </span>
            </span>
            <span className="t-caption line-clamp-2 pl-5 text-text-dim">{c.statementA}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Everything past its freshness window — a list you can actually work through. */
export function StalePanel({
  notes,
  onOpenNote,
}: {
  notes: NoteRef[];
  onOpenNote: (path: string) => void;
}) {
  return (
    <ul className="flex flex-col">
      {notes.map((note) => (
        <li key={note.path}>
          <button
            type="button"
            onClick={() => onOpenNote(note.path)}
            className="flex w-full items-center gap-3 border-b border-border/60 py-2.5 text-left transition-colors hover:bg-blue-tint"
          >
            <span className="t-body min-w-0 flex-1 truncate text-text">{note.title}</span>
            <TierBadge tier={note.tier} />
            <RelativeTime iso={note.updatedAt} className="t-mono" />
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * One note whose YAML frontmatter will not parse.
 *
 * Declared locally on purpose: `GraphAudit.malformedFrontmatter` is emitted by
 * the agent but is **not yet on `GraphAudit` in `cortexos-types`**, which this
 * app may not edit. Reading it through a narrow local shape and a runtime guard
 * keeps the panel honest today without a divergent copy of the contract — see
 * the report for the exact addition needed upstream.
 */
interface MalformedFrontmatter {
  path: string;
  error: string;
}

function malformedFrontmatter(audit: GraphAudit | null): MalformedFrontmatter[] {
  const value = (audit as { malformedFrontmatter?: unknown } | null)?.malformedFrontmatter;
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is MalformedFrontmatter =>
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as MalformedFrontmatter).path === "string",
  );
}

/**
 * What the vault itself needs a human for. Distinct from `health.issues`,
 * which is about the machine.
 *
 * Every item here is a thing that is silently true: 47 notes lose their tags,
 * dates and tier to a YAML error, and 34 wikilinks point at notes nobody has
 * written yet. Neither is an error and neither shows up anywhere else, so both
 * stay invisible for ever unless this renders them.
 */
function VaultHygiene({
  audit,
  onOpenNote,
}: {
  audit: GraphAudit | null;
  onOpenNote: (path: string) => void;
}) {
  const malformed = malformedFrontmatter(audit);
  const unwritten = [...new Set((audit?.danglingEdges ?? []).map((e) => e.target))];
  if (malformed.length === 0 && unwritten.length === 0) return null;

  return (
    <section className="flex flex-col gap-3 border-t border-border pt-4">
      <p className="eyebrow">In the vault</p>

      {malformed.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <p className="t-body text-text">
            {malformed.length} notes have frontmatter that does not parse, so their tags, dates
            and tier are being ignored.
          </p>
          <ul className="flex flex-col">
            {malformed.slice(0, 6).map((note) => (
              <li key={note.path}>
                <button
                  type="button"
                  onClick={() => onOpenNote(note.path)}
                  title={note.error}
                  className="flex w-full items-baseline gap-2 py-1 text-left transition-colors hover:bg-blue-tint"
                >
                  <span className="t-body-sm min-w-0 flex-1 truncate text-text-muted">
                    {titleFromPath(note.path)}
                  </span>
                  <span className="t-mono max-w-[45%] shrink-0 truncate text-text-dim">
                    {note.error}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {malformed.length > 6 ? (
            <p className="t-caption text-text-dim">and {malformed.length - 6} more</p>
          ) : null}
        </div>
      ) : null}

      {unwritten.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          {/* Not an error. A wikilink to a note you have not written is a
              perfectly ordinary thing to find in a vault, and it is a decent
              to-do list — so it is phrased as one. */}
          <p className="t-body text-text">
            {unwritten.length} notes are linked to but not written yet.
          </p>
          <p className="t-caption text-text-dim">{unwritten.slice(0, 8).join(" · ")}</p>
        </div>
      ) : null}
    </section>
  );
}

/** The health issue list, at a size a person reads rather than squints at. */
export function HealthPanel({
  health,
  audit,
  onOpenNote,
  onReauth,
}: {
  health: SystemHealth;
  audit: GraphAudit | null;
  onOpenNote: (path: string) => void;
  onReauth: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      {/*
        `null` means the expiry is UNKNOWN, and unknown is the normal state — a
        token supplied as an environment secret carries no expiry the agent can
        read. This block previously treated the same value as `<= 0` and
        announced "CORTEX is not signed in to Claude yet. Nothing that needs
        Claude can run until it is." on an instance that was signed in and had
        just completed a Claude turn. Silence is the honest rendering of "we do
        not know when this expires"; the Settings panel says so in words.
      */}
      {health.tokenExpiresInDays !== null && health.tokenExpiresInDays <= 14 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border border-warn/50 bg-warn-tint px-3.5 py-3">
          <p className="t-body text-text">
            {health.tokenExpiresInDays === 0
              ? "Your Claude sign-in expires today."
              : `Your Claude sign-in expires in ${health.tokenExpiresInDays} day${health.tokenExpiresInDays === 1 ? "" : "s"}. It happens once a year and takes about a minute.`}
          </p>
          <Button variant="primary" size="md" onClick={onReauth}>
            Re-authorise
          </Button>
        </div>
      ) : null}

      <ul className="flex flex-col gap-3">
        {health.issues.map((issue, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <DotBullet
              line="body"
              tone={
                issue.severity === "error"
                  ? "danger"
                  : issue.severity === "warn"
                    ? "warn"
                    : "neutral"
              }
            />
            <span className="t-body text-text-muted">{issue.message}</span>
          </li>
        ))}
      </ul>

      <dl className="grid grid-cols-2 gap-4 border-t border-border pt-4">
        <div>
          <dt className="eyebrow">Disk free</dt>
          {/*
            Free bytes lead, because bytes are what actually run out: 96% of
            245GB is 9.6GB and fine, 96% of a 20GB volume is 800MB and urgent,
            and a percentage cannot tell those apart. The percentage and the
            measured path stay as context.
          */}
          <dd className="t-body text-text">{formatBytes(health.diskFreeBytes)}</dd>
          <dd className="t-mono text-text-dim" title={health.diskPath}>
            {formatPct(health.diskPct)} of {formatBytes(health.diskTotalBytes)} used
          </dd>
        </div>
        <div>
          <dt className="eyebrow">Index built</dt>
          <dd>
            <RelativeTime iso={health.indexBuiltAt} className="t-body text-text" />
          </dd>
        </div>
      </dl>

      <VaultHygiene audit={audit} onOpenNote={onOpenNote} />
    </div>
  );
}
