/** Ingest sources, uploads, outputs and the discovered connector list. */

import type {
  ClientReport,
  ConnectorInfo,
  DataSource,
  BackgroundStatus,
  IngestChain,
  IngestItem,
  IngestProgress,
  IngestSource,
  OutputArtifact,
  Page,
  PromotionQueue,
  UploadFile,
  UploadResult,
} from "cortexos-types";

import { PROMOTION_QUEUE } from "../fixtures/runs";
import {
  CLIENT_CHANNELS,
  CONNECTORS,
  INGEST_ITEMS,
  INGEST_PROGRESS,
  MAX_UPLOAD_BYTES,
  OUTPUTS,
  SOURCES,
} from "../fixtures/sources";
import { settle } from "./options";

export const sourcesMock: Pick<
  DataSource,
  | "listSources"
  | "getIngestProgress"
  | "listIngestItems"
  | "listIngestChain"
  | "getBackgroundStatus"
  | "listClients"
  | "clearFinishedChains"
  | "getPromotionQueue"
  | "uploadFiles"
  | "listOutputs"
  | "listConnectors"
> = {
  async listSources(): Promise<IngestSource[]> {
    return settle("sources", SOURCES);
  },

  async getIngestProgress(): Promise<IngestProgress> {
    return settle("sources", INGEST_PROGRESS);
  },

  async listIngestItems(cursor?: string): Promise<Page<IngestItem>> {
    void cursor;
    return settle("sources", { items: INGEST_ITEMS, total: INGEST_ITEMS.length });
  },

  /** Mock has no live chain — the modal renders its empty state. */
  async getBackgroundStatus(): Promise<BackgroundStatus> {
    return settle("sources", {
      enabled: true,
      intervalMinutes: 30,
      running: false,
      passes: [],
    });
  },

  async listIngestChain(): Promise<IngestChain[]> {
    return settle("sources", []);
  },

  async listClients(): Promise<ClientReport[]> {
    return settle("sources", CLIENT_CHANNELS);
  },

  async clearFinishedChains(): Promise<void> {
    return settle("sources", undefined);
  },

  async getPromotionQueue(): Promise<PromotionQueue> {
    return settle("sources", PROMOTION_QUEUE);
  },

  /**
   * Mirrors the real refusal rules (`06-http-api.md`) closely enough that the
   * rejection UI can be built and demoed offline: executables, extensionless
   * files, empty files and anything over the size cap come back in
   * `rejected[]`, and the call still resolves — never rejects — because on the
   * live agent one refused file must not fail the other thirty-nine.
   */
  async uploadFiles(files: UploadFile[]): Promise<UploadResult> {
    return settle("sources", () => {
      const itemIds: string[] = [];
      const rejected: UploadResult["rejected"] = [];
      files.forEach((file, i) => {
        const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "";
        if (!ext) {
          rejected.push({
            name: file.name,
            reason:
              "No file extension, so CORTEX cannot tell how to convert it. Rename it with the right extension and try again.",
          });
        } else if (["exe", "app", "dmg", "sh", "bat", "msi"].includes(ext)) {
          rejected.push({
            name: file.name,
            reason: `.${ext} files are executables and are never accepted into a vault.`,
          });
        } else if (file.size === 0) {
          rejected.push({ name: file.name, reason: "The file is empty." });
        } else if (file.size > MAX_UPLOAD_BYTES) {
          rejected.push({
            name: file.name,
            reason: `${file.name} exceeds the 500MB upload limit. Put large media in a watched folder source instead.`,
          });
        } else {
          itemIds.push(`ing_up_${Date.now().toString(36)}_${i}`);
        }
      });
      return { itemIds, rejected };
    });
  },

  async listOutputs(cursor?: string): Promise<Page<OutputArtifact>> {
    void cursor;
    return settle("sources", { items: OUTPUTS, total: OUTPUTS.length });
  },

  /** Discovered across repo, vault, your `~/.claude` and Claude Desktop. */
  async listConnectors(): Promise<ConnectorInfo[]> {
    return settle("sources", CONNECTORS);
  },
};
