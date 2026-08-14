"use client";

import Link from "next/link";
import type { PanelTarget } from "@/lib/panel";
import { cn } from "@/lib/format";

const OPTIONS: { kind: "profile" | "settings"; label: string; hint: string; glyph: string }[] = [
  { kind: "profile", label: "Profile", hint: "What CORTEX believes about you", glyph: "◍" },
  { kind: "settings", label: "Settings", hint: "Connectors, routines, auth", glyph: "◐" },
];

/**
 * View A′ — the hamburger rail. Profile and Settings are two separate
 * destinations, not one merged drawer: clicking either opens it as its own tab
 * in the side panel, so they get the same room as a note or a run log.
 */
export function SidebarRail({
  active,
  onOpen,
}: {
  active: PanelTarget | null;
  onOpen: (target: PanelTarget) => void;
}) {
  return (
    <nav
      aria-label="Profile and settings"
      data-testid="sidebar"
      // Wider than the desktop rail when it is a drawer, because a touch target
      // sized for a mouse is not sized for a thumb; back to 212px inline at lg.
      className="flex h-full w-[min(78vw,264px)] shrink-0 flex-col gap-1 border-r border-border bg-panel p-2 lg:w-[212px]"
    >
      {/*
       * Channels is a route, not a panel — it needs a full page, so it is an
       * anchor rather than an `onOpen` target. Kept in this rail anyway because
       * this is where someone looks for "the other screens".
       */}
      <Link
        href="/clients"
        data-testid="sidebar-clients"
        className="flex items-start gap-2.5 border-l-2 border-transparent px-3 py-2.5 text-left transition-colors hover:bg-bg-alt"
      >
        <span aria-hidden className="t-body text-text-dim">
          ◎
        </span>
        <span className="min-w-0">
          <span className="t-body block text-text">Channels</span>
          <span className="t-caption block text-text-dim">Client content performance</span>
        </span>
      </Link>

      {OPTIONS.map((o) => {
        const isActive = active?.kind === o.kind;
        return (
          <button
            key={o.kind}
            type="button"
            onClick={() => onOpen({ kind: o.kind })}
            aria-current={isActive ? "page" : undefined}
            data-testid={`sidebar-${o.kind}`}
            className={cn(
              "flex items-start gap-2.5 border-l-2 px-3 py-2.5 text-left transition-colors",
              isActive
                ? "border-blue bg-blue-tint"
                : "border-transparent hover:bg-bg-alt",
            )}
          >
            <span aria-hidden className={cn("t-body", isActive ? "text-blue" : "text-text-dim")}>
              {o.glyph}
            </span>
            <span className="min-w-0">
              <span className="t-body block text-text">{o.label}</span>
              <span className="t-caption block text-text-dim">{o.hint}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
