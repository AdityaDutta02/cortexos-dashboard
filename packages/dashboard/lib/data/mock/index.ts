/**
 * MockDataSource — the offline DataSource.
 *
 * It implements every method on the contract, answers from `../fixtures`, and
 * deliberately takes 80–250ms so loading states are real rather than
 * theoretical. `configureMock({ fail })` forces error paths, which is how the
 * error UI on every screen was built honestly.
 *
 * There is no network here, on purpose — `mock` mode makes zero `/api/` calls.
 * See BOUNDARIES.md.
 *
 * ## Why this is a composition and not one class
 *
 * It was one 588-line file, past the 500-line rule. It is now one module per
 * domain, mirroring `../fixtures/`, and this file is the seam that joins them.
 *
 * `IMPL` is annotated `DataSource`, so **a missing or misshapen method is a
 * compile error** — the same guarantee `implements DataSource` gave, without
 * a hundred lines of one-line delegation that can silently drift. The class
 * exists only because `new MockDataSource()` is the shape `index.ts` and any
 * test will reach for; the interface declaration below merges the contract
 * onto its type so callers see every method.
 */

import type { DataSource } from "cortexos-types";

import { configMock } from "./config";
import { graphMock } from "./graph";
import { homeMock } from "./home";
import { notesMock, searchMock } from "./notes";
import { profileMock } from "./profile";
import { runsMock } from "./runs";
import { sourcesMock } from "./sources";

const IMPL: DataSource = {
  ...homeMock,
  ...searchMock,
  ...graphMock,
  ...notesMock,
  ...runsMock,
  ...sourcesMock,
  ...profileMock,
  ...configMock,
};

/** Declaration merging: this is what gives the class every DataSource member. */
export interface MockDataSource extends DataSource {}

export class MockDataSource {
  constructor() {
    Object.assign(this, IMPL);
  }
}

export { configureMock } from "./options";
export type { FailScope } from "./options";
