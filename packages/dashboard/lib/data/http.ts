/**
 * HttpDataSource — the real client.
 *
 * Every path is relative, because `/api/*` is proxied to the agent through
 * Next rewrites (see next.config.ts). Same-origin means the httpOnly
 * `cortex_session` cookie is sent automatically: no `credentials: "include"`,
 * no CORS, no preflight. If you find yourself adding either, the rewrite is
 * misconfigured — fix that, not this file.
 *
 * Contract: packages/agent/docs/06-http-api.md, verified against the live agent.
 */

import type {
  Belief,
  BeliefDrift,
  ClientReport,
  ConnectorInfo,
  DeviceToken,
  IssuedDevice,
  Contradiction,
  CortexConfig,
  VaultProfile,
  CortexError,
  DataSource,
  GraphAudit,
  GraphNeighborhood,
  GraphQuery,
  Headroom,
  HomeSummary,
  BackgroundStatus,
  IngestChain,
  IngestItem,
  IngestProgress,
  IngestSource,
  MonthlyReview,
  NewTaskInput,
  NewTaskResult,
  Note,
  NoteRef,
  ObservedSignals,
  OutputArtifact,
  Page,
  PreflightEstimate,
  PromotionQueue,
  Routine,
  Run,
  SearchQuery,
  SearchResult,
  SkillInfo,
  SuppressedBelief,
  SystemHealth,
  TaskDef,
  UploadFile,
  UploadResult,
} from "cortexos-types";

/** Thrown by every method. Carries the contract's error envelope. */
export class HttpError extends Error {
  constructor(
    readonly error: CortexError,
    readonly status: number,
  ) {
    super(error.message);
    this.name = "HttpError";
  }
}

function envelope(code: CortexError["code"], message: string): CortexError {
  return { code, message };
}

/** The wire shape of a contradiction: `pathA`/`pathB` are new and may be absent. */
type WireContradiction = Omit<Contradiction, "pathA" | "pathB"> & {
  pathA?: string;
  pathB?: string;
};

/** A source file is only that node's own path when its basename is the title. */
function evidencePath(nodeId: string, sourceFile: string | undefined): string {
  if (!sourceFile) return "";
  const base = (sourceFile.split("/").pop() ?? sourceFile).replace(/\.md$/i, "");
  return base.trim().toLowerCase() === nodeId.trim().toLowerCase() ? sourceFile : "";
}

/** Maps a status to a code for responses that are not the documented envelope. */
function codeForStatus(status: number): CortexError["code"] {
  switch (status) {
    case 400:
      return "invalid_input";
    case 401:
      return "unauthorized";
    case 404:
      return "not_found";
    case 409:
      return "conflict";
    case 429:
      return "quota_exceeded";
    case 503:
      return "backend_unavailable";
    default:
      return "internal";
  }
}

export class HttpDataSource implements DataSource {
  /**
   * Relative by default. A non-empty base is only for server-side callers and
   * tests; it must never be set from a `NEXT_PUBLIC_*` variable.
   */
  constructor(private readonly baseUrl: string = "") {}

  private url(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  private async request<T>(
    path: string,
    init?: RequestInit & { expectEmpty?: boolean },
  ): Promise<T> {
    let res: Response;
    try {
      // A FormData body must set its own content-type, boundary included.
      // Forcing application/json onto it produces a body the server rejects
      // as invalid_input, which reads like a bad file rather than a bad header.
      const isMultipart = typeof FormData !== "undefined" && init?.body instanceof FormData;
      res = await fetch(this.url(path), {
        ...init,
        headers: {
          ...(init?.body && !isMultipart ? { "content-type": "application/json" } : {}),
          ...init?.headers,
        },
      });
    } catch (cause) {
      // Network-level failure: the agent is down, or the proxy is not wired.
      throw new HttpError(
        envelope(
          "backend_unavailable",
          "Can't reach CORTEX. It may still be starting up — this retries on its own.",
        ),
        0,
      );
    }

    if (res.status === 204 || init?.expectEmpty) {
      if (!res.ok) throw await this.toError(res);
      return undefined as T;
    }

    if (!res.ok) throw await this.toError(res);

    const text = await res.text();
    if (text.length === 0) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new HttpError(
        envelope("internal", "CORTEX returned a response this dashboard could not read."),
        res.status,
      );
    }
  }

  private async toError(res: Response): Promise<HttpError> {
    let error: CortexError | null = null;
    try {
      const body = (await res.json()) as { error?: CortexError };
      if (body?.error?.code && body.error.message) error = body.error;
    } catch {
      // Non-JSON error body — fall through to a status-derived envelope.
    }
    if (!error) {
      error = envelope(
        codeForStatus(res.status),
        res.status === 401
          ? "Your session has expired. Sign in again to continue."
          : `CORTEX returned ${res.status}.`,
      );
    }
    return new HttpError(error, res.status);
  }

  private get<T>(path: string): Promise<T> {
    return this.request<T>(path);
  }

  private send<T>(method: string, path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  }

  // ---- Home ------------------------------------------------------------
  getHomeSummary(): Promise<HomeSummary> {
    return this.get<HomeSummary>("/api/home");
  }

  getHealth(): Promise<SystemHealth> {
    return this.get<SystemHealth>("/api/health");
  }

  getHeadroom(): Promise<Headroom> {
    return this.get<Headroom>("/api/headroom");
  }

  // ---- Search ----------------------------------------------------------
  search(query: SearchQuery): Promise<SearchResult> {
    return this.send<SearchResult>("POST", "/api/search", query);
  }

  // ---- Graph -----------------------------------------------------------
  getGraph(query: GraphQuery): Promise<GraphNeighborhood> {
    return this.send<GraphNeighborhood>("POST", "/api/graph", query);
  }

  getAudit(): Promise<GraphAudit> {
    return this.get<GraphAudit>("/api/graph/audit");
  }

  /**
   * `pathA`/`pathB` are filled in here when the agent omits them.
   *
   * They were added to `Contradiction` on 2026-08-11 precisely because the UI
   * was passing `nodeA` — a **title** — to `readNote` and getting `not found`
   * for notes that plainly exist. An agent built before that change still
   * sends only the titles, and the panel must not regress to the trap while
   * the two sides land.
   *
   * The only fallback used is `evidenceX.sourceFile`, and only when its
   * basename matches the node title: with `strategy: "thesis"` the evidence
   * file *is* the note, but with `strategy: "provenance"` it is the source
   * document the extraction read, and opening that would confidently show the
   * wrong note. Unmatched, the field stays empty and the UI resolves the title
   * through the note index or renders it as plain text.
   */
  async listContradictions(): Promise<Contradiction[]> {
    const wire = await this.get<WireContradiction[]>("/api/graph/contradictions");
    return wire.map((c) => ({
      ...c,
      pathA: c.pathA ?? evidencePath(c.nodeA, c.evidenceA?.sourceFile),
      pathB: c.pathB ?? evidencePath(c.nodeB, c.evidenceB?.sourceFile),
    }));
  }

  correctNode(node: string, whatIsWrong: string): Promise<{ queuedSiblings: string[] }> {
    return this.send("POST", "/api/graph/correct", { node, whatIsWrong });
  }

  // ---- Notes -----------------------------------------------------------
  listNotes(prefix?: string, cursor?: string): Promise<Page<NoteRef>> {
    const q = new URLSearchParams();
    // The prefix is a DIRECTORY, not a string prefix, and a missing one is a
    // 404 rather than an empty page — doc §"Where the real behaviour differs".
    if (prefix) q.set("prefix", prefix);
    // Cursors are opaque. Pass back verbatim; never parse or construct one.
    if (cursor) q.set("cursor", cursor);
    const qs = q.toString();
    return this.get<Page<NoteRef>>(`/api/notes${qs ? `?${qs}` : ""}`);
  }

  readNote(path: string): Promise<Note> {
    return this.get<Note>(`/api/notes/read?path=${encodeURIComponent(path)}`);
  }

  writeNote(path: string, content: string): Promise<{ sha: string }> {
    return this.send("PUT", "/api/notes", { path, content });
  }

  createNote(path: string, content: string): Promise<{ sha: string; path: string }> {
    return this.send("POST", "/api/notes", { path, content });
  }

  renameNote(from: string, to: string): Promise<{ sha: string; path: string }> {
    return this.send("POST", "/api/notes/rename", { from, to });
  }

  /** Archives. Nothing is ever deleted — spec §5 `keep_all`. */
  deleteNote(path: string): Promise<{ sha: string }> {
    return this.send("DELETE", `/api/notes?path=${encodeURIComponent(path)}`);
  }

  // ---- Tasks & runs ----------------------------------------------------
  listTasks(): Promise<TaskDef[]> {
    return this.get<TaskDef[]>("/api/tasks");
  }

  /**
   * Create a dashboard-button task. Spec §2.4 — CORTEX owns that trigger and
   * can bind a skill to it outright.
   *
   * `routinePrompt` comes back from the agent **verbatim** and is rendered
   * verbatim. Nothing in this app composes that sentence: CORTEX has not
   * registered a Routine and cannot, so the wording that says so is the
   * agent's to own, not the dashboard's to guess.
   */
  createTask(input: NewTaskInput): Promise<NewTaskResult> {
    return this.send("POST", "/api/tasks", input);
  }

  async deleteTask(id: string): Promise<void> {
    await this.request<void>(`/api/tasks/${encodeURIComponent(id)}`, {
      method: "DELETE",
      expectEmpty: true,
    });
  }

  listRoutines(): Promise<Routine[]> {
    return this.get<Routine[]>("/api/routines");
  }

  listRuns(cursor?: string): Promise<Page<Run>> {
    return this.get<Page<Run>>(`/api/runs${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`);
  }

  getRun(id: string): Promise<Run> {
    return this.get<Run>(`/api/runs/${encodeURIComponent(id)}`);
  }

  runTask(taskId: string, inputs?: Record<string, unknown>): Promise<{ runId: string }> {
    return this.send("POST", "/api/runs", { taskId, ...(inputs ? { inputs } : {}) });
  }

  async cancelRun(id: string): Promise<void> {
    await this.request<void>(`/api/runs/${encodeURIComponent(id)}/cancel`, {
      method: "POST",
      expectEmpty: true,
    });
  }

  preflight(taskId: string, inputs?: Record<string, unknown>): Promise<PreflightEstimate> {
    return this.send("POST", "/api/preflight", { taskId, ...(inputs ? { inputs } : {}) });
  }

  // ---- Sources & ingest ------------------------------------------------
  listSources(): Promise<IngestSource[]> {
    return this.get<IngestSource[]>("/api/sources");
  }

  getIngestProgress(): Promise<IngestProgress> {
    return this.get<IngestProgress>("/api/ingest/progress");
  }

  listIngestItems(cursor?: string): Promise<Page<IngestItem>> {
    return this.get<Page<IngestItem>>(
      `/api/ingest/items${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
    );
  }

  getBackgroundStatus(): Promise<BackgroundStatus> {
    return this.get<BackgroundStatus>("/api/background");
  }

  listClients(): Promise<ClientReport[]> {
    return this.get<ClientReport[]>("/api/clients");
  }

  async listIngestChain(): Promise<IngestChain[]> {
    const { items } = await this.get<{ items: IngestChain[] }>("/api/ingest/chain");
    return items;
  }

  async clearFinishedChains(): Promise<void> {
    await this.send<void>("POST", "/api/ingest/chain/clear");
  }

  getPromotionQueue(): Promise<PromotionQueue> {
    return this.get<PromotionQueue>("/api/ingest/queue");
  }

  /**
   * Real bytes, `multipart/form-data`, field name `files` repeated per file.
   *
   * The `Content-Type` header is deliberately **not** set: the browser has to
   * add the multipart boundary, and setting it by hand produces a body the
   * server cannot parse. `request()` only adds a JSON content-type when it is
   * given a body it serialised itself, so a FormData body passes through clean.
   *
   * `200` comes back even when every file was refused — per-file outcomes are
   * in `rejected[]`, so one bad file never fails the batch. A `4xx` here means
   * the *request* was malformed, not that a file was.
   */
  uploadFiles(files: UploadFile[]): Promise<UploadResult> {
    const form = new FormData();
    for (const file of files) form.append("files", file.data, file.name);
    return this.request<UploadResult>("/api/ingest/upload", { method: "POST", body: form });
  }

  // ---- Outputs ---------------------------------------------------------
  listOutputs(cursor?: string): Promise<Page<OutputArtifact>> {
    return this.get<Page<OutputArtifact>>(
      `/api/outputs${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
    );
  }

  // ---- Profile ---------------------------------------------------------
  listBeliefs(category?: string): Promise<Belief[]> {
    return this.get<Belief[]>(
      `/api/profile/beliefs${category ? `?category=${encodeURIComponent(category)}` : ""}`,
    );
  }

  updateBelief(id: string, statement: string): Promise<Belief> {
    return this.send("PUT", `/api/profile/beliefs/${encodeURIComponent(id)}`, { statement });
  }

  confirmBelief(id: string): Promise<Belief> {
    return this.send("POST", `/api/profile/beliefs/${encodeURIComponent(id)}/confirm`);
  }

  suppressBelief(id: string, note?: string): Promise<SuppressedBelief> {
    return this.send("POST", `/api/profile/beliefs/${encodeURIComponent(id)}/suppress`, { note });
  }

  listSuppressed(): Promise<SuppressedBelief[]> {
    return this.get<SuppressedBelief[]>("/api/profile/suppressed");
  }

  listDrifts(): Promise<BeliefDrift[]> {
    return this.get<BeliefDrift[]>("/api/profile/drifts");
  }

  getObservedSignals(): Promise<ObservedSignals> {
    return this.get<ObservedSignals>("/api/profile/signals");
  }

  async getMonthlyReview(): Promise<MonthlyReview | null> {
    const review = await this.get<MonthlyReview | null>("/api/profile/monthly-review");
    // The live agent returns a review with an empty question list rather than
    // null when there is nothing to ask. Treat that as "no review".
    if (!review || !review.questions || review.questions.length === 0) return null;
    return review;
  }

  // ---- Skills & connectors ---------------------------------------------
  /**
   * Enumerated from disk, never from `cortex.yaml` — the config's
   * `skills.enabled` is a wish list, and rendering it produced four skills
   * whose buttons would 404 on click.
   *
   * "Disk" now means every place a skill actually lives: the repo's
   * `.claude/skills/`, the adopted vault's, and the user's own `~/.claude/`.
   * Reading only the repo reported one skill to a user with dozens. Each
   * record carries `source` and `invocable` so the UI can say which is which.
   */
  listSkills(): Promise<SkillInfo[]> {
    return this.get<SkillInfo[]>("/api/skills");
  }

  /**
   * `installed` carries full records, not names, so the UI never re-fetches to
   * render a row. `unlisted` is the reverse of `missing`: on disk, absent from
   * `cortex.yaml` — which is the normal state for everything discovered
   * outside the repo.
   */
  getSkillsReport(): Promise<{
    installed: SkillInfo[];
    missing: string[];
    unlisted: string[];
  }> {
    return this.get<{ installed: SkillInfo[]; missing: string[]; unlisted: string[] }>(
      "/api/skills/report",
    );
  }

  /**
   * MCP connectors from wherever they are configured — `cortex.yaml`,
   * `~/.claude.json`, Claude Desktop. `[]` is still a legitimate answer and
   * still renders as an honest empty state; what is never legitimate is
   * calling `listSources()` here, which returns `ingest.sources` template
   * entries and is what once drew five phantom connectors.
   */
  listConnectors(): Promise<ConnectorInfo[]> {
    return this.get<ConnectorInfo[]>("/api/connectors");
  }

  // ---- MCP devices -----------------------------------------------------
  listDevices(): Promise<DeviceToken[]> {
    return this.get<DeviceToken[]>("/api/devices");
  }

  /** The response carries the only copy of the plaintext token that will exist. */
  issueDevice(label: string): Promise<IssuedDevice> {
    return this.send("POST", "/api/devices", { label });
  }

  revokeDevice(handle: string): Promise<{ revoked: boolean }> {
    return this.send("DELETE", `/api/devices/${encodeURIComponent(handle)}`);
  }

  // ---- Settings --------------------------------------------------------
  /** The adopted vault's layout, so nothing hardcodes a folder name (spec §16.2). */
  getVaultProfile(): Promise<VaultProfile> {
    return this.get<VaultProfile>("/api/vault/profile");
  }

  getConfig(): Promise<CortexConfig> {
    return this.get<CortexConfig>("/api/config");
  }

  updateConfig(patch: Partial<CortexConfig>): Promise<CortexConfig> {
    return this.send("PATCH", "/api/config", patch);
  }

  startReauth(): Promise<{ verificationUrl: string; userCode: string; expiresAt: string }> {
    return this.send("POST", "/api/auth/reauth");
  }
}

/** Exchanges the shared password for the session cookie. Open-dev ignores it. */
export async function login(password: string): Promise<void> {
  const res = await fetch("/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    let message = "That password was not accepted.";
    try {
      const body = (await res.json()) as { error?: CortexError };
      if (body?.error?.message) message = body.error.message;
    } catch {
      // keep the default
    }
    throw new HttpError(envelope("unauthorized", message), res.status);
  }
}

export async function logout(): Promise<void> {
  await fetch("/logout", { method: "POST" });
}
