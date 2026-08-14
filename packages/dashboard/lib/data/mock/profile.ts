/** Beliefs, drifts, observed signals and the monthly review. */

import type {
  Belief,
  BeliefDrift,
  DataSource,
  MonthlyReview,
  ObservedSignals,
  SuppressedBelief,
} from "cortexos-types";

import {
  BELIEFS,
  DRIFTS,
  MONTHLY_REVIEW,
  OBSERVED_SIGNALS,
  SUPPRESSED,
} from "../fixtures/profile";
import { err, settle } from "./options";

export const profileMock: Pick<
  DataSource,
  | "listBeliefs"
  | "updateBelief"
  | "confirmBelief"
  | "suppressBelief"
  | "listSuppressed"
  | "listDrifts"
  | "getObservedSignals"
  | "getMonthlyReview"
> = {
  async listBeliefs(category?: string): Promise<Belief[]> {
    return settle("profile", () =>
      category ? BELIEFS.filter((b) => b.category === category) : BELIEFS,
    );
  },

  async updateBelief(id: string, statement: string): Promise<Belief> {
    return settle("profile", () => {
      const belief = BELIEFS.find((b) => b.id === id);
      if (!belief) throw err("not_found", `No belief ${id}`);
      return { ...belief, statement, origin: "told", lastConfirmed: new Date().toISOString() };
    });
  },

  async confirmBelief(id: string): Promise<Belief> {
    return settle("profile", () => {
      const belief = BELIEFS.find((b) => b.id === id);
      if (!belief) throw err("not_found", `No belief ${id}`);
      return {
        ...belief,
        lastConfirmed: new Date().toISOString(),
        observationCount: belief.observationCount + 1,
        confidence: Math.min(1, belief.confidence + 0.05),
      };
    });
  },

  async suppressBelief(id: string, note?: string): Promise<SuppressedBelief> {
    return settle("profile", () => {
      const belief = BELIEFS.find((b) => b.id === id);
      if (!belief) throw err("not_found", `No belief ${id}`);
      return {
        id: `sp_${id}`,
        statement: belief.statement,
        suppressedAt: new Date().toISOString(),
        note,
      };
    });
  },

  async listSuppressed(): Promise<SuppressedBelief[]> {
    return settle("profile", SUPPRESSED);
  },

  async listDrifts(): Promise<BeliefDrift[]> {
    return settle("profile", DRIFTS);
  },

  async getObservedSignals(): Promise<ObservedSignals> {
    return settle("profile", OBSERVED_SIGNALS);
  },

  async getMonthlyReview(): Promise<MonthlyReview | null> {
    return settle("profile", MONTHLY_REVIEW);
  },
};
