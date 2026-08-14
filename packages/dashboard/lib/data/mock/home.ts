/** Home, health and headroom — the one round trip View A opens with. */

import type { DataSource, Headroom, HomeSummary, SystemHealth } from "cortexos-types";

import { CONNECTED_DIGEST } from "../fixtures/graph";
import { DECISIONS } from "../fixtures/home";
import { HEADROOM, PROMOTION_QUEUE } from "../fixtures/runs";
import { HEALTH } from "../fixtures/sources";
import { STALE_NOTES } from "../fixtures/vault";
import { settle } from "./options";
import { recentRuns } from "./runs";

export const homeMock: Pick<DataSource, "getHomeSummary" | "getHealth" | "getHeadroom"> = {
  async getHomeSummary(): Promise<HomeSummary> {
    return settle("home", () => ({
      recentRuns: recentRuns().slice(0, 6),
      decisions: DECISIONS,
      stale: STALE_NOTES,
      connected: CONNECTED_DIGEST,
      headroom: HEADROOM,
      backlog: PROMOTION_QUEUE,
      health: HEALTH,
    }));
  },

  async getHealth(): Promise<SystemHealth> {
    return settle("home", HEALTH);
  },

  async getHeadroom(): Promise<Headroom> {
    return settle("home", HEADROOM);
  },
};
