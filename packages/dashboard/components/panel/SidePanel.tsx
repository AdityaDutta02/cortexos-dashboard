"use client";

import type { WorkspaceData } from "@/lib/data/workspace";
import type { PanelTarget } from "@/lib/panel";
import type { NodePathResolver } from "@/lib/node-path";
import { Button } from "@/components/ui";
import { NotePanel } from "./NotePanel";
import { RunPanel } from "./RunPanel";
import {
  ContradictionListPanel,
  ContradictionPanel,
  HealthPanel,
  StalePanel,
} from "./GraphPanels";
import { AddConnectorPanel, ConnectorPanel } from "./ConnectorPanels";
import { NewSkillPanel, SkillPanel } from "./SkillPanels";
import { TaskPanel } from "./TaskPanels";
import { NewTaskPanel } from "./NewTaskPanel";
import { ProfilePanel, SettingsPanel } from "./ProfileSettingsPanels";

/**
 * The one side panel. Every "this doesn't fit" in the app resolves here:
 * a note, a run log, a contradiction's two statements, a connector's config,
 * a skill, the health list, the stale list, Profile, Settings.
 *
 * Content types are a switch, not subclasses — adding a kind means adding a
 * case and a small component, never a new layout.
 */
export function SidePanel({
  target,
  data,
  resolver,
  onClose,
  onSelect,
  onReauth,
  onReload,
}: {
  target: PanelTarget;
  data: WorkspaceData;
  /**
   * The one title→path crossing, owned by the workspace so the rails and the
   * panel cannot disagree about what a node id means. See lib/node-path.ts.
   */
  resolver: NodePathResolver;
  onClose: () => void;
  onSelect: (target: PanelTarget) => void;
  onReauth: () => void;
  /**
   * Re-run `loadWorkspace`. A panel that creates or deletes something has to
   * be able to make the rails agree with it — otherwise the `+` produces a
   * toast and no visible change, which breaks "one click, one visible change".
   */
  onReload: () => void;
}) {
  const { title, subtitle, body } = render(
    target,
    data,
    resolver,
    onSelect,
    onReauth,
    onClose,
    onReload,
  );

  return (
    <section
      data-testid="side-panel"
      aria-label={title}
      className="flex min-h-0 flex-col border border-border bg-bg"
    >
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border bg-strip px-4 py-3">
        <div className="min-w-0">
          <h2 className="t-title truncate text-text">{title}</h2>
          {subtitle ? <p className="t-mono mt-0.5 truncate text-text-dim">{subtitle}</p> : null}
        </div>
        <Button size="sm" variant="ghost" onClick={onClose} aria-label="Close panel">
          <span aria-hidden>✕</span>
        </Button>
      </header>

      {/* One scroll container for this region. `.scroll-region` carries the
          `position: relative` that stops a tall note's layout overflow
          reaching the initial containing block and scrolling the whole app. */}
      <div className="scroll-region min-h-0 flex-1 p-4">
        <div className="measure">{body}</div>
      </div>
    </section>
  );
}

interface Rendered {
  title: string;
  subtitle?: string;
  body: React.ReactNode;
}

function render(
  target: PanelTarget,
  data: WorkspaceData,
  resolver: NodePathResolver,
  onSelect: (t: PanelTarget) => void,
  onReauth: () => void,
  close: () => void,
  reload: () => void,
): Rendered {
  const lookup = (name: string): string | null => resolver.resolve(name);

  switch (target.kind) {
    case "note":
      return {
        title: label(target.path),
        subtitle: target.path,
        body: (
          <NotePanel
            path={target.path}
            /*
             * Wikilinks address notes by NAME and the panel addresses them by
             * PATH. The note index is the lookup table; the graph is a
             * fallback for nodes whose file the index has not seen.
             */
            resolveLink={(t) => (resolver.ready ? Boolean(lookup(t)) : true)}
            onOpenLink={(t) => {
              const path = lookup(t);
              if (path) onSelect({ kind: "note", path });
            }}
          />
        ),
      };

    case "run": {
      /*
       * The list is a SEED, not the source. A run pressed a second ago is not
       * in `recentRuns` — that comes from the slow half of the load and was
       * fetched before the run existed — so looking it up here and rendering
       * `Missing` when absent is what made a fresh run read as "no longer in
       * view". The panel fetches it by id; this only saves it a first request.
       */
      const run = data.summary?.recentRuns.find((r) => r.id === target.id);
      return {
        title: target.label ?? run?.label ?? "Run",
        subtitle: run ? `${run.trigger.replace(/_/g, " ")} · ${run.model ?? "—"}` : undefined,
        body: (
          <RunPanel
            runId={target.id}
            seed={run}
            onOpenNote={(p) => onSelect({ kind: "note", path: p })}
            onFinished={reload}
          />
        ),
      };
    }

    case "contradiction": {
      const cx = data.contradictions.find((c) => c.id === target.id);
      return {
        title: "Two things disagree",
        subtitle: cx ? `detected ${cx.detectedAt.slice(0, 10)}` : undefined,
        body: cx ? (
          <ContradictionPanel
            contradiction={cx}
            resolvePath={lookup}
            onOpenNote={(p) => onSelect({ kind: "note", path: p })}
          />
        ) : (
          <Missing />
        ),
      };
    }

    case "contradictions": {
      const open = data.contradictions.filter((c) => c.status === "open");
      return {
        title: "Open contradictions",
        subtitle: `${open.length} unresolved`,
        body: (
          <ContradictionListPanel
            contradictions={open}
            onOpen={(id) => onSelect({ kind: "contradiction", id })}
          />
        ),
      };
    }

    case "stale":
      return {
        title: "Past its freshness window",
        subtitle: data.summary ? `${data.summary.stale.length} notes` : undefined,
        body: data.summary ? (
          <StalePanel
            notes={data.summary.stale}
            onOpenNote={(p) => onSelect({ kind: "note", path: p })}
          />
        ) : (
          <NotYet />
        ),
      };

    case "health":
      return {
        title: "System health",
        // No invented status. An unchecked system is not "green".
        subtitle: data.summary?.health.status,
        body: data.summary ? (
          <HealthPanel
            health={data.summary.health}
            audit={data.audit}
            onOpenNote={(p) => onSelect({ kind: "note", path: p })}
            onReauth={onReauth}
          />
        ) : (
          <NotYet />
        ),
      };

    case "connector": {
      const connector = data.connectors.find((c) => c.id === target.id);
      return {
        title: connector?.label ?? "Connector",
        subtitle: connector?.health,
        body: connector ? <ConnectorPanel connector={connector} /> : <Missing />,
      };
    }

    case "add-connector":
      return { title: "Add an MCP server", body: <AddConnectorPanel onDone={close} /> };

    case "skill": {
      const usage = data.signals.skillUsage.find((s) => s.skill === target.name);
      const edited = data.signals.heavilyEditedSkills.find((s) => s.skill === target.name);
      const skill = data.skills.find((s) => s.name === target.name);
      return {
        title: target.name,
        subtitle: usage ? `${usage.count} runs` : "never run",
        body: <SkillPanel skill={skill} name={target.name} usage={usage} edited={edited} />,
      };
    }

    case "new-skill":
      return {
        title: "New skill",
        subtitle: "runs in your Claude, not here",
        body: <NewSkillPanel owner={data.config.owner.name} />,
      };

    case "task": {
      const task = data.tasks.find((t) => t.id === target.id);
      return {
        title: task?.label ?? "Task",
        /*
         * The subtitle says what the trigger is, never when it next runs.
         * `nextRun` is only meaningful for a Routine, and CORTEX cannot create
         * one — rendering a next-run time for a task it made up would be the
         * schedule that does not exist.
         */
        subtitle: task?.skill ? `dashboard button · ${task.skill}` : "dashboard button",
        body: task ? (
          <TaskPanel
            task={task}
            runs={data.summary?.recentRuns ?? []}
            onOpenRun={(id) => onSelect({ kind: "run", id, label: task.label })}
            onDeleted={() => {
              reload();
              close();
            }}
            onStarted={(id) => onSelect({ kind: "run", id, label: task.label })}
          />
        ) : (
          <Missing />
        ),
      };
    }

    case "new-task": {
      /*
       * Each branch is titled differently because each is a different promise,
       * and only one of them ends in something CORTEX made.
       */
      const heading =
        target.mode === "button"
          ? { title: "New button", subtitle: "CORTEX makes this one" }
          : target.mode === "routine"
            ? { title: "New scheduled task", subtitle: "you register it in your Claude" }
            : target.mode === "job"
              ? { title: "Describe a job", subtitle: "Claude writes it, this reads it" }
              : { title: "New task", subtitle: "three kinds — pick one" };
      return {
        ...heading,
        body: (
          <NewTaskPanel
            mode={target.mode}
            skills={data.skills}
            onChooseMode={(mode) => onSelect({ kind: "new-task", ...(mode ? { mode } : {}) })}
            onCreated={() => {
              reload();
              close();
            }}
            onOpenSkills={() => onSelect({ kind: "new-skill" })}
          />
        ),
      };
    }

    case "profile":
      return {
        title: "Profile",
        subtitle: data.config.owner.name,
        body: (
          <ProfilePanel
            beliefs={data.beliefs}
            suppressed={data.suppressed}
            signals={data.signals}
          />
        ),
      };

    case "settings":
      return {
        title: "Settings",
        subtitle: `template v${data.config.serviceability.template_version}`,
        body: <SettingsPanel config={data.config} />,
      };
  }
}

function Missing() {
  return <p className="t-body text-text-muted">That item is no longer in view.</p>;
}

/**
 * Distinct from `Missing`, deliberately.
 *
 * `summary` arrives in the second half of the load, so a panel opened in the
 * first second has data that does not exist *yet*. Saying "no longer in view"
 * there would be a plain falsehood about a record that is on its way.
 */
function NotYet() {
  return <p className="t-body text-text-muted">Still loading…</p>;
}

function label(path: string): string {
  const base = path.split("/").pop() ?? path;
  return base
    .replace(/\.md$/, "")
    .replace(/-/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}
