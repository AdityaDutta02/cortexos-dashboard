"use client";

import Link from "next/link";
import type { ClientReport } from "cortexos-types";

/**
 * The client list. Mirrors the app's existing sidebar idiom — 2px active bar,
 * blue tint — so this screen reads as part of CORTEX rather than a microsite.
 */
export function ClientRail({
  reports,
  activeId,
  generatedAt,
}: {
  reports: ClientReport[];
  activeId: string;
  /** Newest report date across all clients. Replaces the design's "last sync". */
  generatedAt?: string;
}) {
  return (
    <aside className="hidden w-[236px] shrink-0 flex-col border-r border-border bg-paper lg:flex">
      <Link
        href="/"
        className="flex items-center gap-2 border-b border-border px-[18px] py-5 transition-colors hover:bg-blue-tint"
      >
        <span className="block h-3.5 w-3.5 bg-blue" />
        <span className="text-card-title text-[15px] text-text">Cortex</span>
      </Link>
      <div className="text-eyebrow px-[18px] pt-[18px] pb-2.5 text-text-dim">
        Channels — {reports.length}
      </div>
      <nav className="flex flex-col">
        {reports.map((report) => {
          const active = report.id === activeId;
          return (
            <Link
              key={report.id}
              href={`/clients/${report.id}`}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "flex flex-col gap-[3px] border-l-2 border-blue bg-blue-tint px-4 py-3"
                  : "flex flex-col gap-[3px] border-l-2 border-transparent px-4 py-3 hover:bg-blue-tint"
              }
            >
              <span className={active ? "t-body-sm font-semibold text-text" : "t-body-sm text-text"}>
                {report.client}
              </span>
              <span className="t-body-sm text-[12px] text-text-muted">
                {/*
                 * An in-house channel is labelled as one. The design assumed
                 * every row was a client; presenting a house channel that way
                 * would misstate the roster to whoever reads the screen.
                 */}
                {report.isClient === false
                  ? `In-house · ${report.platform ?? "channel"}`
                  : [report.agency, report.platform].filter(Boolean).join(" · ")}
              </span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-1.5 border-t border-border px-[18px] py-4">
        {/*
         * The design said "Last sync". Nothing syncs — a skill generates these
         * by hand, so this says when that last happened and nothing more.
         */}
        <span className="text-eyebrow text-text-dim">Reports generated</span>
        <span className="t-body-sm text-[12px] text-text-muted">{generatedAt ?? "—"}</span>
      </div>
    </aside>
  );
}
