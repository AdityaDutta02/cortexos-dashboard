"use client";

import Link from "next/link";
import { DEFAULT_HIDDEN_CLASSES, type RelationClass } from "@/components/graph/palette";
import { useState } from "react";
import { RUNS } from "@/lib/data/fixtures/runs";
import { GRAPH_EDGES, GRAPH_NODES } from "@/lib/data/fixtures/graph";
import { GraphSurface } from "@/components/graph/GraphSurface";
import { GraphLegend } from "@/components/graph/GraphLegend";
import { Markdown } from "@/components/detail/Markdown";
import { Frontmatter, stripFrontmatter } from "@/components/detail/Frontmatter";
import { NOTE_REFS } from "@/lib/data/fixtures/vault";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import {
  Badge,
  Button,
  Card,
  Chip,
  Dialog,
  Dot,
  EmptyState,
  ErrorState,
  Eyebrow,
  HealthBadge,
  Input,
  MatchedByBadge,
  Meter,
  Module,
  Panel,
  Popover,
  ProgressBar,
  ProposedBadge,
  RelativeTime,
  RunStatusBadge,
  Select,
  Skeleton,
  SkeletonLines,
  Stat,
  Table,
  Tabs,

  Textarea,
  TierBadge,
  Toggle,
  Tooltip,
  useToast,
} from "@/components/ui";
import { Swatches } from "./Swatches";

/**
 * Every component, every variant, on one page. This is the review surface —
 * flip the theme toggle at the top to check the dark ramp without leaving it.
 */
export function Styleguide() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toggle, setToggle] = useState(true);
  const [chip, setChip] = useState("causes");
  const [graphFilter, setGraphFilter] = useState<RelationClass[]>(DEFAULT_HIDDEN_CLASSES);

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-6 px-6 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <Eyebrow>Design system</Eyebrow>
          <h1 className="mt-2 font-heading text-[36px] font-medium leading-[38px] text-text">
            Every component, both themes.
          </h1>
          <p className="mt-2 max-w-[60ch] font-body text-[14.5px] leading-[23px] text-text-muted">
            Hand-built on Tailwind v4 tokens. No component-library dependency. Materials carried
            over from the reference build: mono eyebrows, hairline borders, dashed grids, tight
            negative tracking, blue as the only accent.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex h-7 items-center border border-border px-2.5 font-body text-[12.5px] text-text transition-colors hover:border-border-strong"
          >
            ← App
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <Panel label="Colour tokens">
        <Swatches />
      </Panel>

      <Panel label="Type scale">
        <p className="t-body-sm measure mb-5 text-text-muted">
          Sizes and tracking are the measured supermemory values. The rule:{" "}
          <strong className="text-text">11px mono is for labels only</strong>. Anything a person
          reads starts at 13px, and a content row defaults to 15px.
        </p>
        <div className="flex flex-col divide-y divide-border border-y border-border">
          {[
            { cls: "t-metric", spec: "32 / 34 / -1.2 · Space Grotesk 500", use: "the one big number in a module", sample: "1,284" },
            { cls: "t-title", spec: "22 / 28.6 / -0.66 · Space Grotesk 500", use: "side-panel title", sample: "Two things disagree" },
            { cls: "t-subtitle", spec: "18 / 26 / -0.36 · Space Grotesk 500", use: "sub-heading in a panel", sample: "Implementation bottleneck" },
            { cls: "t-body-lg", spec: "16 / 26.4 / -0.08 · DM Sans", use: "long-form prose, markdown", sample: "Time-to-first-value is gated by clinical review, not engineering." },
            { cls: "t-body", spec: "15 / 24 / -0.18 · DM Sans", use: "THE DEFAULT — every primary rail row", sample: "Google Drive — Leadership" },
            { cls: "t-body-sm", spec: "14 / 21 / -0.07 · DM Sans", use: "secondary rows, issue lists", sample: "Confirmed 3 edges on Pricing Policy" },
            { cls: "t-caption", spec: "13 / 19.5 · DM Sans", use: "the smallest prose is allowed to be", sample: "ranked, waiting · 46 warm · 11 hot" },
            { cls: "t-mono-lg", spec: "13 / 18 · DM Mono", use: "mono that carries content", sample: "skills/board-pack/SKILL.md" },
            { cls: "t-mono", spec: "12 / 16 · DM Mono", use: "counts, times, paths", sample: "7h · 3.4k · 12%" },
            { cls: "eyebrow-lg", spec: "12 / 18 / 1.2 · DM Mono 500", use: "rail module header", sample: "Connectors" },
            { cls: "eyebrow", spec: "11 / 16.5 / 1.54 · DM Mono 500", use: "labels only — never content", sample: "Trigger" },
          ].map((row) => (
            <div key={row.cls} className="grid gap-2 py-3.5 md:grid-cols-[168px_minmax(0,1fr)]">
              <div>
                <p className="t-mono text-blue">.{row.cls}</p>
                <p className="t-caption text-text-dim">{row.spec}</p>
                <p className="t-caption text-text-dim">{row.use}</p>
              </div>
              <p className={`${row.cls} text-text`}>{row.sample}</p>
            </div>
          ))}
        </div>
        <p className="t-body measure mt-5 text-text-muted">
          Prose is capped with <span className="t-mono text-text">.measure</span> (68ch). The
          reference caps its own columns at 860px; this paragraph is showing that limit.
        </p>
      </Panel>

      <Panel label="Buttons">
        <div className="flex flex-col gap-4">
          {(["primary", "secondary", "ghost", "danger"] as const).map((v) => (
            <div key={v} className="flex flex-wrap items-center gap-3">
              <span className="eyebrow w-20">{v}</span>
              <Button variant={v} size="sm">Small</Button>
              <Button variant={v} size="md">Medium</Button>
              <Button variant={v} size="lg">Large</Button>
              <Button variant={v} loading>Loading</Button>
              <Button variant={v} disabled>Disabled</Button>
              <Button variant={v} iconLeft={<span aria-hidden>＋</span>}>With icon</Button>
            </div>
          ))}
        </div>
      </Panel>

      <Panel label="Badges, chips and status">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {(["neutral", "blue", "ok", "warn", "danger", "outline"] as const).map((t) => (
              <Badge key={t} tone={t}>{t}</Badge>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <TierBadge tier={0} />
            <TierBadge tier={1} />
            <TierBadge tier={2} />
            <ProposedBadge />
            <MatchedByBadge matchedBy={["keyword", "semantic"]} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(["queued", "running", "succeeded", "failed", "cancelled", "paused"] as const).map((s) => (
              <RunStatusBadge key={s} status={s} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(["ok", "degraded", "failing", "unconfigured"] as const).map((h) => (
              <HealthBadge key={h} health={h} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {["causes", "proves", "contradicts", "instance-of"].map((r) => (
              <Chip key={r} selected={chip === r} onClick={() => setChip(r)}>{r}</Chip>
            ))}
          </div>
        </div>
      </Panel>

      <Panel label="Meters and progress">
        <div className="grid gap-6 md:grid-cols-2">
          <Meter
            value={0.08}
            label="Used this week"
            threshold={0.2}
            thresholdLabel="After one backlog batch"
            caption="CORTEX used 8% of your weekly Claude."
          />
          <Meter value={0.72} label="Warn threshold" caption="Turns amber past 60%." />
          <Meter value={0.93} label="Near the ceiling" caption="Turns red past 85%." />
          <div className="flex flex-col gap-4">
            <ProgressBar value={0.42} label="Determinate" />
            <ProgressBar label="Indeterminate — progress unknown" />
            <ProgressBar value={1} tone="ok" label="Complete" />
            <ProgressBar value={0.3} tone="danger" label="Failed" />
          </div>
        </div>
      </Panel>

      <Panel label="Form controls">
        <div className="grid gap-5 md:grid-cols-2">
          <Input label="Note title" placeholder="Pricing policy" hint="Becomes the filename." />
          <Input label="With an error" defaultValue="  " error="A title is required." />
          <Select
            label="Relation type"
            options={[
              { value: "causes", label: "causes" },
              { value: "proves", label: "proves" },
              { value: "contradicts", label: "contradicts" },
            ]}
          />
          <Textarea label="What's wrong with this?" placeholder="One sentence is enough." />
          <Toggle
            checked={toggle}
            onChange={setToggle}
            label="Work on my backlog during my sessions"
            description="Up to 3 small units per call. Every one shows up in the run log."
          />
          <Toggle checked={false} onChange={() => undefined} label="Disabled" disabled />
        </div>
      </Panel>

      <Panel label="Table" dense>
        <Table
          rows={NOTE_REFS.slice(0, 6)}
          rowKey={(r) => r.path}
          columns={[
            { key: "title", header: "Note", cell: (r) => r.title, sortValue: (r) => r.title },
            { key: "tier", header: "Tier", cell: (r) => <TierBadge tier={r.tier} />, sortValue: (r) => r.tier },
            {
              key: "updated",
              header: "Updated",
              align: "right",
              cell: (r) => <RelativeTime iso={r.updatedAt} />,
              sortValue: (r) => r.updatedAt,
            },
          ]}
        />
      </Panel>

      <Panel label="Table — dense and empty" dense>
        <Table
          rows={[]}
          rowKey={() => ""}
          dense
          columns={[{ key: "a", header: "Anything", cell: () => null }]}
          emptyTitle="No runs yet"
          emptyDetail="Nothing has been triggered on this instance."
        />
      </Panel>

      <div className="grid gap-5 md:grid-cols-2">
        <Panel label="Feedback states">
          <div className="flex flex-col gap-4">
            <SkeletonLines rows={3} />
            <Skeleton className="h-16" />
            <EmptyState
              title="Nothing is waiting on you"
              detail="No open contradictions, no drifting beliefs, no broken connectors."
              action={<Button size="sm">Process backlog</Button>}
            />
            <ErrorState
              error={{ code: "backend_unavailable", message: "The home service did not respond. It will retry." }}
              onRetry={() => undefined}
            />
          </div>
        </Panel>

        <Panel label="Overlays and stats">
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-3 gap-4">
              <Stat label="Nodes" value="4,812" />
              <Stat label="Open conflicts" value="2" tone="warn" hint="Surfaced, never auto-resolved" />
              <Stat label="Failing" value="1" tone="danger" />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => setDialogOpen(true)}>Open dialog</Button>
              <Button onClick={() => toast({ tone: "ok", message: "Saved. Committed as one change." })}>
                Toast — ok
              </Button>
              <Button onClick={() => toast({ tone: "warn", message: "Drive is rate limited; 38 files waiting." })}>
                Toast — warn
              </Button>
              <Button onClick={() => toast({ tone: "danger", message: "Mailbox connector is unauthorised.", duration: 0 })}>
                Toast — pinned
              </Button>
              <Tooltip content="Small units of queued work that ride your live session.">
                <Button variant="ghost">Hover me</Button>
              </Tooltip>
            </div>
            <Card className="p-4">
              <Eyebrow>Card</Eyebrow>
              <p className="mt-1.5 font-body text-[13.5px] text-text-muted">
                A hairline block on paper. Interactive variant adds hover.
              </p>
            </Card>
            <Card interactive className="p-4">
              <Eyebrow>Card — interactive</Eyebrow>
            </Card>
          </div>
        </Panel>
      </div>

      <Panel label="Tabs">
        <Tabs
          items={[
            {
              id: "runs",
              label: "Runs",
              count: RUNS.length,
              content: (
                <ul className="flex flex-col gap-2">
                  {RUNS.slice(0, 3).map((r) => (
                    <li key={r.id} className="flex items-center gap-2">
                      <RunStatusBadge status={r.status} />
                      <span className="font-body text-[13.5px]">{r.label}</span>
                      <RelativeTime iso={r.startedAt} className="ml-auto" />
                    </li>
                  ))}
                </ul>
              ),
            },
            { id: "routines", label: "Routines", count: 2, content: <p className="font-body text-[13.5px] text-text-muted">Registered on the client&apos;s own Claude account.</p> },
            { id: "logs", label: "Logs", content: <p className="font-mono text-[11.5px] text-text-muted">2026-08-10T07:19:40Z info Committed as 1 batch</p> },
          ]}
        />
      </Panel>

      <Panel label="Dots — the primary status carrier">
        <div className="flex flex-wrap items-center gap-5">
          {(["ok", "warn", "danger", "blue", "neutral"] as const).map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <Dot tone={t} />
              <span className="font-mono text-[10.5px] text-text-dim">{t}</span>
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <Dot tone="danger" pulse />
            <span className="font-mono text-[10.5px] text-text-dim">pulse</span>
          </span>
        </div>
      </Panel>

      <Panel label="Graph — drag a node, scroll to zoom, double-click to fit" dense>
        <div className="relative h-[420px] bg-bg">
          <GraphSurface
            nodes={GRAPH_NODES}
            edges={GRAPH_EDGES}
            hiddenClasses={graphFilter}
            onSelect={() => undefined}
            flags={{
              conflict: new Set(["20-areas/pricing-policy.md", "30-resources/enterprise-deal-desk-notes.md"]),
              stale: new Set(["30-resources/contracts/analytics-vendor-contract.md"]),
              fresh: new Set(["insights/constraint-moves-it-does-not-disappear.md"]),
            }}
          />
          <div className="absolute bottom-3 left-3">
            <GraphLegend
              nodes={GRAPH_NODES}
              edges={GRAPH_EDGES}
              hidden={graphFilter}
              onChange={setGraphFilter}
            />
          </div>
        </div>
      </Panel>

      <div className="grid gap-5 md:grid-cols-2">
        <Panel label="Module — the rail container">
          <div className="grid h-[180px] grid-cols-2 gap-2">
            <Module label="Ingest" value={<Dot tone="warn" />}>
              <span className="font-heading text-[26px] leading-none font-medium">57</span>
            </Module>
            <Module label="Skills" value={<span className="font-mono text-[10.5px] text-text-dim">5</span>}>
              <span className="font-body text-[12px] text-text-muted">bars go here</span>
            </Module>
          </div>
        </Panel>

        <Panel label="Popover">
          <Popover
            align="start"
            trigger={({ open, toggle }) => (
              <Button variant="secondary" onClick={toggle} aria-expanded={open}>
                Open popover
              </Button>
            )}
          >
            <p className="font-body text-[13px] text-text-muted">
              Detail hides here so the chip stays glanceable.
            </p>
          </Popover>
        </Panel>
      </div>

      <Panel label="Markdown viewer">
        {/* Deliberately exercises every construct the previous hand-rolled
            renderer passed through as literal characters — GFM table,
            blockquote (incl. nested), thematic break, bold, fenced code,
            task list, strikethrough — plus a dangling wikilink. */}
        <Frontmatter data={{ tags: ["styleguide", "markdown"], type: "reference" }} />
        <Markdown
          source={stripFrontmatter(MARKDOWN_SAMPLE)}
          resolveLink={(t) => t !== "A Note That Does Not Exist"}
        />
      </Panel>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Before this runs"
        description="Nothing has been sent to Claude yet. This is the estimate."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Not now</Button>
            <Button variant="primary" onClick={() => setDialogOpen(false)}>Run it</Button>
          </>
        }
      >
        <p className="font-body text-[15px] leading-[24px] text-text">
          46 files from the promotion queue. Roughly 12% of your weekly Claude, about 9 minutes.
        </p>
      </Dialog>
    </div>
  );
}

/** The markdown torture test. Every line here used to render as raw text. */
const MARKDOWN_SAMPLE = `---
tags: [styleguide]
---

## Edges

causes:: [[Implementation Bottleneck]]
proves:: [[Net Retention Thesis]]
relates-to:: [[A Note That Does Not Exist]]

**Arc:** time-to-first-value is gated by clinical review, not engineering.
It is hard-wrapped in the file, and it is *one* paragraph.

> The rebuild collided with itself and search kept answering confidently.
>
> > A nested quote, because reply chains exist.

---

| # | Block | Time | Spends Claude |
|---|-------|-----:|:-------------:|
| 1 | convert | 4m | no |
| 2 | group | 1m | no |
| 3 | extract | 12m | **yes** |

- [x] tables render
- [ ] ~~raw pipes~~ do not
- nested:
  - and it indents

Inline \`code\` stays inline, and a fenced block highlights:

\`\`\`ts
export function nodeRadius(degree: number): number {
  return 4 + Math.sqrt(Math.max(0, degree)) * 3.1; // 4px floor
}
\`\`\`

<script>alert("this is escaped, never executed")</script>
`;
