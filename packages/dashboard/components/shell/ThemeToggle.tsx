"use client";

import { useTheme } from "@/lib/theme";

/**
 * Binary sun/moon. One click, one visible change — no third state to click
 * through. "System" still exists, in Settings, for anyone who wants it.
 */
export function ThemeToggle() {
  const { resolved, toggle } = useTheme();
  const next = resolved === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      data-testid="theme-toggle"
      title={`Switch to ${next}`}
      aria-label={`Switch to ${next} theme`}
      className="flex h-7 w-7 items-center justify-center border border-border text-text-muted transition-colors duration-200 hover:border-border-strong hover:text-text"
    >
      <span aria-hidden className="text-[12px] leading-none">
        {resolved === "dark" ? "☀" : "☾"}
      </span>
    </button>
  );
}
