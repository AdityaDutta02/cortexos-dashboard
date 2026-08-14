"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_HIDDEN_CLASSES, type RelationClass } from "@/components/graph/palette";
import { ds } from "@/lib/data";
import { useAsync } from "@/lib/use-async";
import {
  loadCore,
  loadRest,
  mergeWorkspace,
  type CoreData,
  type RestData,
} from "@/lib/data/workspace";
import { panelNodePath, type PanelTarget } from "@/lib/panel";
import { idsForPaths, useNodePathResolver } from "@/lib/node-path";
import { GraphSurface, type NodeFlags } from "@/components/graph/GraphSurface";
import { GraphLegend } from "@/components/graph/GraphLegend";
import { GraphContext } from "@/components/detail/GraphContext";
import { SidePanel } from "@/components/panel/SidePanel";
import { ConnectorsModule } from "@/components/modules/ConnectorsModule";
import { ContradictionsModule } from "@/components/modules/ContradictionsModule";
import { HealthModule } from "@/components/modules/HealthModule";
import { IngestModal } from "@/components/modules/IngestModal";
import { useUpload } from "@/lib/use-upload";
import { InsightsModule } from "@/components/modules/InsightsModule";
import { OutputsModule } from "@/components/modules/OutputsModule";
import { SkillsModule } from "@/components/modules/SkillsModule";
import { TasksModule } from "@/components/modules/TasksModule";
import { Button, Dialog, ErrorState, Skeleton, useToast } from "@/components/ui";
import { SidebarRail } from "./SidebarRail";
import { TopBar } from "./TopBar";

interface DeviceCode {
  verificationUrl: string;
  userCode: string;
  expiresAt: string;
}

/**
 * The entire application: one screen, two views.
 *
 * View A  — wide rails around a dominant graph.
 * View A′ — plus the Profile/Settings rail on the far left.
 * View B  — the side panel is open: the graph moves left and, when the panel
 *           is showing a node, zooms to it.
 *
 * Nothing here navigates. Opening a detail is state, so the top bar never
 * reloads and the user never loses their place.
 */
export function Workspace() {
  /*
   * TWO LOADS, STARTED TOGETHER. `loadCore` is three fast calls and gates the
   * first paint; `loadRest` is eleven, one of which waits on a graph audit that
   * costs up to 18s. They were a single `useAsync` and the screen was blank for
   * as long as the slowest of the fourteen — measured at ~10s on the deployed
   * instance.
   *
   * Only `core` can produce the error screen. A failure inside `rest` is
   * reported per-module through `partial`, because losing the outputs list is
   * not a reason to take the dashboard away.
   */
  const core = useAsync<CoreData>(loadCore, []);
  const rest = useAsync<RestData>(loadRest, []);
  const { toast } = useToast();
  const router = useRouter();

  const { loading, error } = core;
  const data = useMemo(
    () => (core.data ? mergeWorkspace(core.data, rest.data) : null),
    [core.data, rest.data],
  );
  /** True while the slow half is still in flight — every skeleton reads this. */
  const pending = rest.loading;
  const reload = useCallback(() => {
    core.reload();
    rest.reload();
  }, [core, rest]);

  // No session yet: send them to sign in rather than showing an error they
  // cannot act on. Open-dev signs in automatically from there.
  useEffect(() => {
    if (error?.code === "unauthorized") router.replace("/sign-in");
  }, [error, router]);

  const [panel, setPanel] = useState<PanelTarget | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  /*
   * Which relation classes are filtered out. `mentions` starts hidden: a typed
   * edge is an assertion and a wikilink is only a mention, so the default view
   * is the 1,286 things he actually stated rather than all 2,980 lines. The
   * legend turns them on, and filtering removes links from the live simulation
   * so the layout re-settles either way.
   */
  const [hiddenClasses, setHiddenClasses] = useState<RelationClass[]>(DEFAULT_HIDDEN_CLASSES);
  const [deviceCode, setDeviceCode] = useState<DeviceCode | null>(null);
  const [reauthBusy, setReauthBusy] = useState(false);

  const openNote = useCallback(
    (node: { id: string; path: string }) => setPanel({ kind: "note", path: node.path }),
    [],
  );

  const startReauth = useCallback(async () => {
    setReauthBusy(true);
    try {
      setDeviceCode(await ds.startReauth());
    } catch (cause) {
      // The server's own words. "Re-auth unavailable" hid the one thing the
      // user needs to know — that the fix is `claude setup-token` on a machine
      // with a browser, because the dashboard flow is not bound to Anthropic.
      toast({
        tone: "danger",
        message: cause instanceof Error ? cause.message : "Re-auth unavailable",
      });
    } finally {
      setReauthBusy(false);
    }
  }, [toast]);

  /** The one title→path crossing in the app. See lib/node-path.ts. */
  const resolver = useNodePathResolver(data?.graph.nodes ?? []);

  /**
   * Node state, not text: conflicts pulse red, stale notes get a dotted amber
   * ring, and anything a recent run touched carries a blue halo.
   *
   * **Every set here is keyed by node id**, because the renderer looks up
   * `n.id`. `Contradiction.nodeA/nodeB` are already ids; `stale[].path` and
   * `Run.wrote[]` are paths and have to be translated. They were being added
   * raw, so the amber and blue rings matched nothing on a live vault and two
   * of the three signals silently drew nothing at all.
   */
  const flags: NodeFlags = useMemo(() => {
    const conflict = new Set<string>();
    if (!data) return { conflict, stale: new Set<string>(), fresh: new Set<string>() };

    for (const c of data.contradictions) {
      if (c.status !== "open") continue;
      conflict.add(c.nodeA);
      conflict.add(c.nodeB);
    }
    // Both rings come from the slow half, so they simply do not exist yet on
    // first paint. Empty sets draw nothing, which is right: an unringed node is
    // "not known to be stale", and that is exactly true until the audit lands.
    const stale = idsForPaths(
      data.graph.nodes,
      data.summary?.stale.map((n) => n.path) ?? [],
    );
    const fresh = idsForPaths(
      data.graph.nodes,
      data.summary?.recentRuns.slice(0, 3).flatMap((run) => run.wrote) ?? [],
    );
    return { conflict, stale, fresh };
  }, [data]);

  /**
   * The panel addresses notes by path; the graph addresses them by id (a title
   * on the live agent). This is the one place the two namespaces meet.
   */
  const focusId = useMemo(() => {
    const path = panelNodePath(panel);
    if (!path || !data) return null;
    return data.graph.nodes.find((n) => n.path === path)?.id ?? null;
  }, [panel, data]);

  /*
   * DROP ANYWHERE. THE WHOLE DASHBOARD IS THE TARGET.
   *
   * The drop zone used to be a box inside one module, roughly a tenth of the
   * screen. Drag a file onto any other part of the dashboard and the browser
   * navigated away from the app to render the PDF — or, if the drag ended just
   * outside the box, nothing happened at all and the file was silently gone.
   * Either way the user's reasonable conclusion was that ingest ignored them.
   *
   * `dragDepth` counts enter/leave pairs because they fire for every child
   * element crossed; a boolean flickers off the moment the cursor moves between
   * two panels.
   */
  const dragDepth = useRef(0);
  const [dropping, setDropping] = useState(false);
  const [ingestOpen, setIngestOpen] = useState(false);
  const { entries: uploads, upload } = useUpload();

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      dragDepth.current = 0;
      setDropping(false);
      const files = Array.from(event.dataTransfer.files);
      if (files.length === 0) return;
      upload(files);
      setIngestOpen(true);
    },
    [upload],
  );

  return (
    /*
      `h-dvh`, not `h-screen`. On mobile Safari `100vh` is the viewport with the
      URL bar hidden, so a full-height shell is taller than what is actually on
      screen and the bottom row sits permanently under the browser chrome.
      `dvh` tracks the real height. `h-screen` is kept as the fallback for the
      handful of engines without dvh support.
    */
    <div
      className="app-shell relative flex h-screen h-dvh flex-col overflow-hidden bg-bg"
      onDragEnter={(e) => {
        // Only for actual files. A text selection dragged across the page is
        // not an upload, and lighting the whole screen up for one is noise.
        if (!Array.from(e.dataTransfer.types).includes("Files")) return;
        e.preventDefault();
        dragDepth.current += 1;
        setDropping(true);
      }}
      onDragOver={(e) => {
        if (!Array.from(e.dataTransfer.types).includes("Files")) return;
        // Without this the browser navigates to the file and the app is gone.
        e.preventDefault();
      }}
      onDragLeave={() => {
        dragDepth.current -= 1;
        if (dragDepth.current <= 0) setDropping(false);
      }}
      onDrop={onDrop}
    >
      {dropping ? (
        <div
          data-testid="global-dropzone"
          className="pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center gap-2 border-4 border-dashed border-blue bg-bg/90 text-center"
        >
          <span aria-hidden className="t-metric text-blue">↓</span>
          <p className="t-body-lg text-text">Drop to ingest</p>
          <p className="t-body-sm text-text-muted">
            It lands in your vault, then gets connected to your graph.
          </p>
        </div>
      ) : null}

      {/* The receipt for the drop. Mounted at the shell so it survives whatever
          the user does to the modules underneath it. */}
      <IngestModal entries={uploads} open={ingestOpen} onClose={() => setIngestOpen(false)} />
      <TopBar
        health={data?.summary?.health ?? null}
        headroom={data?.summary?.headroom ?? null}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onOpenNote={(path) => setPanel({ kind: "note", path })}
        onOpenHealth={() => setPanel({ kind: "health" })}
        onReauth={startReauth}
        reauthBusy={reauthBusy}
      />

      {data && data.partial.length > 0 ? (
        <div
          role="status"
          data-testid="partial-notice"
          className="t-body-sm shrink-0 border-b border-warn/50 bg-warn-tint px-3 py-2 text-text"
        >
          Some of this screen could not load: {data.partial.join(", ")}. Everything else is
          current.
        </div>
      ) : null}

      {data?.graph.truncated ? (
        /*
         * A clipped neighbourhood renders as a perfectly plausible graph — the
         * exact "correct-looking output over incomplete input" failure that has
         * cost this build four times (the half-built index, the config wish
         * list, the ingest-source connectors, the title-as-path 404). It is a
         * correctness signal, so it gets words, above the canvas, every time.
         */
        <div
          role="status"
          data-testid="graph-truncated-notice"
          className="t-body-sm shrink-0 border-b border-warn/50 bg-warn-tint px-3 py-2 text-text"
        >
          This graph is part of your vault, not all of it — {data.graph.nodes.length} nodes was
          the limit and there are more. What is drawn is real; what is missing is not drawn.
        </div>
      ) : null}

      <div className="relative flex min-h-0 flex-1">
        {/*
          The rail is inline on a laptop and an overlay drawer on a phone. On a
          390px screen an inline 212px rail leaves 178px for the graph, which is
          not a narrower layout so much as an unusable one.

          The switch is pure CSS — `absolute … lg:static` — deliberately, rather
          than a JS breakpoint check. A `useMediaQuery` would render one tree on
          the server and another on the client, which is the hydration class of
          bug this component's header already commits to avoiding.
        */}
        {sidebarOpen ? (
          <>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setSidebarOpen(false)}
              className="absolute inset-0 z-20 bg-black/40 lg:hidden"
            />
            <div className="absolute inset-y-0 left-0 z-30 flex lg:static lg:z-auto">
              <SidebarRail
                active={panel}
                onOpen={(target) => {
                  setPanel(target);
                  // On a phone the drawer covers the panel it just opened, so
                  // it has to get out of the way. On a laptop the rail is
                  // inline and closing it would be a regression — the user
                  // expects to click Profile, then Settings.
                  //
                  // Reading the breakpoint here is safe where reading it during
                  // render would not be: this runs only on a real click, long
                  // after hydration, so there is no server/client tree to
                  // disagree about.
                  if (window.matchMedia("(max-width: 1023px)").matches) {
                    setSidebarOpen(false);
                  }
                }}
              />
            </div>
          </>
        ) : null}

        {loading ? (
          <LoadingFrame />
        ) : error ? (
          <div className="flex flex-1 items-center justify-center p-6">
            <div className="w-full max-w-[440px]">
              <ErrorState error={error} onRetry={reload} />
            </div>
          </div>
        ) : data ? (
          panel ? (
            /* ---- View B ---------------------------------------------- */
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 p-2 lg:grid-cols-[minmax(0,1fr)_minmax(400px,46%)]">
              <GraphContext
                nodes={data.graph.nodes}
                edges={data.graph.edges}
                flags={flags}
                focus={focusId}
                hiddenClasses={hiddenClasses}
                onHiddenChange={setHiddenClasses}
                onSelect={openNote}
              />
              <SidePanel
                target={panel}
                data={data}
                resolver={resolver}
                onClose={() => setPanel(null)}
                onSelect={setPanel}
                onReauth={startReauth}
                onReload={reload}
              />
            </div>
          ) : (
            /* ---- View A ----------------------------------------------
               Below `lg` the rails stack and this grid is the ONE scroll
               container for the whole view; the modules' own `overflow-y-auto`
               never fires there because their rows are content-sized. At `lg`
               the grid is fixed to the viewport and each module scrolls
               itself. */
            <div className="relative grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-y-auto overscroll-contain p-2 lg:grid-cols-[300px_minmax(0,1fr)_300px] lg:overflow-hidden">
              {/*
                Rows are `auto` except the one that should absorb the slack.
                An `auto` row is exactly its content's height, which is what
                keeps a two-row module from reserving a third of the rail and
                leaving it blank.
              */}
              {/*
                Every row is `minmax(0, auto)` — content-sized, and able to
                shrink and scroll itself rather than reserving height it does
                not need. Insights takes the slack, with a floor: at a 700px
                viewport the other three squeezed it to a 24px slit holding
                2,397px of content, which is the same "no dead space" rule
                failing in the opposite direction.
              */}
              <div className="order-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:order-1 lg:min-h-0 lg:grid-cols-1 lg:grid-rows-[minmax(0,auto)_minmax(150px,1fr)_minmax(0,auto)_minmax(0,auto)]">
                <ModuleSlot pending={pending && !data.summary} minHeight="min-h-20">
                  {/*
                    Health, where Ingest used to be. Dropping a file is now a
                    dashboard-wide gesture with its own modal, and the backlog
                    drains on a timer — so this slot stopped being a control
                    surface and became a status one.
                  */}
                  {data.summary ? (
                    <HealthModule
                      health={data.summary.health}
                      backlog={data.summary.backlog}
                      onOpenHealth={() => setPanel({ kind: "health" })}
                    />
                  ) : null}
                </ModuleSlot>
                {/* Insights reads the graph, which is CORE — so it draws
                    immediately and only its `connected`/`stale` annotations
                    wait. Passing empty arrays is honest here in a way a
                    skeleton would not be: the insights themselves are real. */}
                <InsightsModule
                  nodes={data.graph.nodes}
                  edges={data.graph.edges}
                  connected={data.summary?.connected ?? []}
                  stale={data.summary?.stale ?? []}
                  resolvePath={resolver.resolve}
                  onOpen={setPanel}
                />
                <ModuleSlot pending={pending} minHeight="min-h-20">
                  <ContradictionsModule
                    contradictions={data.contradictions}
                    onOpen={setPanel}
                  />
                </ModuleSlot>
                <ModuleSlot pending={pending} minHeight="min-h-20">
                  <OutputsModule
                    outputs={data.outputs}
                    onOpen={(path) => setPanel({ kind: "note", path })}
                  />
                </ModuleSlot>
              </div>

              <div className="relative order-1 min-h-[46vh] border border-border bg-bg lg:order-2 lg:min-h-0">
                <GraphSurface
                  nodes={data.graph.nodes}
                  edges={data.graph.edges}
                  flags={flags}
                  hiddenClasses={hiddenClasses}
                  onSelect={openNote}
                />
                <div className="pointer-events-none absolute right-2.5 bottom-2.5 left-2.5">
                  <div className="pointer-events-auto inline-block">
                    <GraphLegend
                      nodes={data.graph.nodes}
                      edges={data.graph.edges}
                      hidden={hiddenClasses}
                      onChange={setHiddenClasses}
                    />
                  </div>
                </div>
              </div>

              {/* Tasks is content-sized; connectors and skills are the two
                  long lists on a real machine (14 servers, 131 skills), so
                  they split the slack and scroll inside themselves. */}
              <div className="order-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:min-h-0 lg:grid-cols-1 lg:grid-rows-[minmax(0,auto)_minmax(130px,1fr)_minmax(130px,1fr)]">
                {/* Tasks come from CORE, so the buttons are pressable at once;
                    only the run history behind them waits. */}
                <TasksModule
                  runs={data.summary?.recentRuns ?? []}
                  tasks={data.tasks}
                  onOpen={(id) => setPanel({ kind: "run", id })}
                  onOpenTask={(id) => setPanel({ kind: "task", id })}
                  onNew={() => setPanel({ kind: "new-task" })}
                />
                <ModuleSlot pending={pending} minHeight="min-h-28">
                  <ConnectorsModule
                    connectors={data.connectors}
                    onOpen={(id) => setPanel({ kind: "connector", id })}
                    onAdd={() => setPanel({ kind: "add-connector" })}
                  />
                </ModuleSlot>
                <ModuleSlot pending={pending} minHeight="min-h-28">
                  <SkillsModule
                    skills={data.skills}
                    missing={data.skillsMissing}
                    signals={data.signals}
                    onOpen={(name) => setPanel({ kind: "skill", name })}
                    onNew={() => setPanel({ kind: "new-skill" })}
                  />
                </ModuleSlot>
              </div>
            </div>
          )
        ) : null}
      </div>

      <Dialog
        open={Boolean(deviceCode)}
        onClose={() => setDeviceCode(null)}
        title="Re-authorise Claude"
        width="sm"
        footer={
          <Button variant="primary" onClick={() => setDeviceCode(null)}>
            Done
          </Button>
        }
      >
        {deviceCode ? (
          <div className="flex flex-col gap-3">
            <a
              href={deviceCode.verificationUrl}
              target="_blank"
              rel="noreferrer"
              className="t-body-lg text-blue underline underline-offset-2"
            >
              {deviceCode.verificationUrl}
            </a>
            <p className="border border-border bg-paper px-3 py-3 text-center font-mono text-[26px] tracking-[0.2em] text-text">
              {deviceCode.userCode}
            </p>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}

/**
 * A module that has not received its data yet.
 *
 * A skeleton rather than an empty module, because the two say opposite things:
 * an empty CONNECTORS module states that there are no connectors, and stating
 * that while the answer is still in flight is the "correct-looking output over
 * incomplete input" failure this codebase keeps re-finding — just rendered
 * instead of computed. The skeleton says "not yet", which is the truth.
 *
 * `min-h` matches the loaded module so nothing jumps when the data lands.
 */
function ModuleSlot({
  pending,
  minHeight,
  children,
}: {
  pending: boolean;
  minHeight: string;
  children: React.ReactNode;
}) {
  if (pending) return <Skeleton className={`h-full ${minHeight}`} />;
  return <>{children}</>;
}

/** Matches the loaded layout exactly, so nothing shifts when data lands. */
function LoadingFrame() {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-hidden p-2 lg:grid-cols-[300px_minmax(0,1fr)_300px]">
      <div className="order-2 grid gap-2 lg:order-1 lg:min-h-0 lg:grid-rows-4">
        <Skeleton className="h-full min-h-20" />
        <Skeleton className="h-full min-h-20" />
        <Skeleton className="h-full min-h-20" />
        <Skeleton className="h-full min-h-20" />
      </div>
      <Skeleton className="order-1 min-h-[46vh] lg:order-2 lg:min-h-0" />
      <div className="order-3 grid gap-2 lg:min-h-0 lg:grid-rows-3">
        <Skeleton className="h-full min-h-28" />
        <Skeleton className="h-full min-h-28" />
        <Skeleton className="h-full min-h-28" />
      </div>
    </div>
  );
}
