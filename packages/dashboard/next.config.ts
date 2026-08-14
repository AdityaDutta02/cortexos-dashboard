import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

/**
 * CORTEX web dashboard.
 *
 * The browser only ever sees ONE origin. `/api/*`, `/login` and `/logout` are
 * proxied through Next rewrites to the agent, so the httpOnly `cortex_session`
 * cookie is same-origin and simply works — no CORS, no preflight, no
 * `credentials: "include"`, no origin allowlist to keep in sync.
 *
 * There is deliberately no `NEXT_PUBLIC_*` API URL: the base URL must never
 * reach the browser bundle, because a cross-origin base is exactly what this
 * design rules out. `CORTEX_AGENT_URL` is server-side only.
 *
 * See packages/agent/docs/06-http-api.md — "Base URL and the proxy".
 */
const nextConfig: NextConfig = {
  transpilePackages: ["cortexos-types"],
  agentRules: false,
  /**
   * Phase 2 packaging. Emits `.next/standalone` with a self-contained server
   * and only the node_modules it actually traced, which is what keeps the
   * container from carrying a pnpm workspace it cannot resolve at runtime.
   *
   * Harmless locally: `next dev` and `next start` are unaffected — this only
   * adds an output directory.
   */
  output: "standalone",
  /**
   * The workspace root, not `packages/dashboard`. Without it Next traces dependencies
   * from the wrong directory and silently omits the hoisted pnpm store, which
   * produces a standalone build that starts and then 500s on first render.
   *
   * `fileURLToPath`, not `.pathname`: the latter stays percent-encoded, so a
   * checkout under a directory with a space in its name resolves to a path that
   * does not exist and the build dies on canonicalization.
   */
  outputFileTracingRoot: fileURLToPath(new URL("../../", import.meta.url)),
  async rewrites() {
    const agent = process.env.CORTEX_AGENT_URL ?? "http://127.0.0.1:8787";
    return [
      { source: "/api/:path*", destination: `${agent}/api/:path*` },
      { source: "/login", destination: `${agent}/login` },
      { source: "/logout", destination: `${agent}/logout` },
    ];
  },
};

export default nextConfig;
