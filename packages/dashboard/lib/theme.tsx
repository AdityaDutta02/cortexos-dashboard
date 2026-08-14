"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type ThemeChoice = "light" | "dark" | "system";

const STORAGE_KEY = "cortex.theme";

/**
 * Runs in <head> before paint.
 *
 * Critically it ALWAYS writes data-theme — resolving "system" to a concrete
 * light/dark at boot — so the toggle is never a no-op. The previous build left
 * the attribute off under "system", which meant the first click could produce
 * no visible change and read as broken.
 *
 * "system" is remembered separately in localStorage, so the Settings option
 * still tracks the OS on later visits.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var k=${JSON.stringify(STORAGE_KEY)};var s=localStorage.getItem(k);var m=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";var t=(s==="light"||s==="dark")?s:m;document.documentElement.setAttribute("data-theme",t);document.documentElement.setAttribute("data-theme-source",s==="light"||s==="dark"?"explicit":"system")}catch(e){}})();`;

/* -------------------------------------------------------------------------
   The DOM attribute IS the state. React subscribes to it rather than mirroring
   it, which keeps the provider free of mount-time setState.
   ------------------------------------------------------------------------- */

const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
    mq.removeEventListener("change", listener);
  };
}

/** What is painted right now — always concrete. */
function readResolved(): "light" | "dark" {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

/** What the user chose, which may be "system". */
function readChoice(): ThemeChoice {
  if (document.documentElement.getAttribute("data-theme-source") === "system") return "system";
  return readResolved();
}

function applySystem(): void {
  const next = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
  document.documentElement.setAttribute("data-theme-source", "system");
}

interface ThemeContextValue {
  /** Light, dark, or system. Only Settings exposes "system". */
  choice: ThemeChoice;
  /** What is actually painted. Never "system". */
  resolved: "light" | "dark";
  setChoice: (next: ThemeChoice) => void;
  /** Binary flip. One click, one visible change — always. */
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const resolved = useSyncExternalStore<"light" | "dark">(subscribe, readResolved, () => "light");
  const choice = useSyncExternalStore<ThemeChoice>(subscribe, readChoice, () => "light");

  const setChoice = useCallback((next: ThemeChoice) => {
    if (next === "system") {
      window.localStorage.removeItem(STORAGE_KEY);
      applySystem();
    } else {
      window.localStorage.setItem(STORAGE_KEY, next);
      document.documentElement.setAttribute("data-theme", next);
      document.documentElement.setAttribute("data-theme-source", "explicit");
    }
    emit();
  }, []);

  const toggle = useCallback(() => {
    setChoice(readResolved() === "dark" ? "light" : "dark");
  }, [setChoice]);

  const value = useMemo(
    () => ({ choice, resolved, setChoice, toggle }),
    [choice, resolved, setChoice, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Read/write the active theme. Throws outside ThemeProvider — that is a bug. */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
