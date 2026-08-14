/**
 * THE SWITCH.
 *
 * The only file in `packages/dashboard` that decides which DataSource is live.
 * Components import `ds` and nothing else.
 *
 *   NEXT_PUBLIC_CORTEX_DATASOURCE=http   (default) — the real agent
 *   NEXT_PUBLIC_CORTEX_DATASOURCE=mock             — offline dev, fixtures
 *
 * This is a mode flag, not a URL. There is deliberately no public base-URL
 * variable: `HttpDataSource` uses relative paths so the browser stays
 * same-origin behind the Next rewrite proxy.
 *
 * The mock is not dead code — it is offline dev mode and the fixture source
 * for /styleguide. Do not delete it.
 */

import type { DataSource } from "cortexos-types";
import { HttpDataSource } from "./http";
import { MockDataSource } from "./mock";

export type DataSourceMode = "http" | "mock";

export const MODE: DataSourceMode =
  process.env.NEXT_PUBLIC_CORTEX_DATASOURCE === "mock" ? "mock" : "http";

export const ds: DataSource = MODE === "mock" ? new MockDataSource() : new HttpDataSource();

/** True when the UI is running on fixtures — the styleguide leans on this. */
export const IS_MOCK = MODE === "mock";

export { MockDataSource } from "./mock";
export { HttpDataSource, HttpError, login, logout } from "./http";
export { configureMock } from "./mock";
export type { FailScope } from "./mock";
