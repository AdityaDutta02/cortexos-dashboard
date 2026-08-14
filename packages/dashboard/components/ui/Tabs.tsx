"use client";

import type { ReactNode } from "react";
import { useId, useRef, useState } from "react";
import { cn } from "@/lib/format";

export interface TabItem {
  id: string;
  label: string;
  /** Rendered next to the label as `[3]`. */
  count?: number;
  content: ReactNode;
}

/**
 * Tabs — WAI-ARIA tab pattern with roving arrow-key focus, Home/End, and
 * `aria-controls` wiring. Only the active panel is mounted.
 */
export function Tabs({
  items,
  initialId,
  onChange,
  className,
}: {
  items: TabItem[];
  initialId?: string;
  onChange?: (id: string) => void;
  className?: string;
}) {
  const base = useId();
  const [active, setActive] = useState(initialId ?? items[0]?.id ?? "");
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const select = (id: string) => {
    setActive(id);
    onChange?.(id);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const i = items.findIndex((t) => t.id === active);
    if (i < 0) return;
    let next = i;
    if (e.key === "ArrowRight") next = (i + 1) % items.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + items.length) % items.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    else return;
    e.preventDefault();
    const target = items[next];
    if (!target) return;
    select(target.id);
    refs.current[target.id]?.focus();
  };

  const activeItem = items.find((t) => t.id === active);

  return (
    <div className={className}>
      <div
        role="tablist"
        onKeyDown={onKeyDown}
        className="flex items-stretch gap-0 border-b border-border"
      >
        {items.map((t) => {
          const selected = t.id === active;
          return (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[t.id] = el;
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`${base}-panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(t.id)}
              className={cn(
                "-mb-px border-b-2 px-4 py-2.5 font-body text-[14px] font-medium transition-colors duration-200",
                selected
                  ? "border-blue text-text"
                  : "border-transparent text-text-muted hover:text-text",
              )}
            >
              {t.label}
              {t.count !== undefined ? (
                <span className="ml-1.5 font-mono text-[11px] text-text-dim">[{t.count}]</span>
              ) : null}
            </button>
          );
        })}
      </div>
      {activeItem ? (
        <div
          role="tabpanel"
          id={`${base}-panel-${activeItem.id}`}
          aria-labelledby={`${base}-tab-${activeItem.id}`}
          tabIndex={0}
          className="pt-4"
        >
          {activeItem.content}
        </div>
      ) : null}
    </div>
  );
}
