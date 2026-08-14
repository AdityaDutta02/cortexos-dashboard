"use client";

import type { Headroom, SystemHealth } from "cortexos-types";
import { HealthChip } from "./HealthChip";
import { SearchBox } from "./SearchBox";
import { SessionStats } from "./SessionStats";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Four things: hamburger · health · search · Claude session stats.
 * Identical on both views, so the frame never moves under the user.
 */
export function TopBar({
  health,
  headroom,
  sidebarOpen,
  onToggleSidebar,
  onOpenNote,
  onOpenHealth,
  onReauth,
  reauthBusy,
}: {
  health: SystemHealth | null;
  headroom: Headroom | null;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenNote: (path: string) => void;
  onOpenHealth: () => void;
  onReauth: () => void;
  reauthBusy?: boolean;
}) {
  return (
    <header className="flex h-13 shrink-0 items-center gap-3 border-b border-border bg-bg px-3">
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-expanded={sidebarOpen}
        aria-label="Profile and settings"
        data-testid="sidebar-toggle"
        className="flex h-8 w-8 shrink-0 items-center justify-center border border-border text-text transition-colors hover:border-border-strong"
      >
        <span className="block h-px w-4 bg-current shadow-[0_5px_0_0_currentColor,0_-5px_0_0_currentColor]" />
      </button>

      <HealthChip
        health={health}
        onReauth={onReauth}
        reauthBusy={reauthBusy}
        onOpenDetail={onOpenHealth}
      />

      <div className="flex flex-1 justify-center px-2">
        <SearchBox onOpen={onOpenNote} />
      </div>

      <SessionStats headroom={headroom} />
      <ThemeToggle />
    </header>
  );
}
