"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/format";
import { EmptyState } from "./Feedback";

export interface Column<T> {
  key: string;
  header: string;
  /** Cell renderer. Keep it presentational — no data fetching in here. */
  cell: (row: T) => ReactNode;
  /** Provide to make the column sortable. Return a comparable primitive. */
  sortValue?: (row: T) => string | number;
  className?: string;
  align?: "left" | "right";
}

export interface TableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Compact row height for long lists. */
  dense?: boolean;
  emptyTitle?: string;
  emptyDetail?: string;
  onRowClick?: (row: T) => void;
  caption?: string;
}

/**
 * Table — sortable headers, a dense variant, and an empty state built in.
 * Sorting is local and uncontrolled; a server-sorted table should pass
 * pre-sorted rows and omit `sortValue`.
 */
export function Table<T>({
  columns,
  rows,
  rowKey,
  dense = false,
  emptyTitle = "Nothing here yet",
  emptyDetail,
  onRowClick,
  caption,
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [asc, setAsc] = useState(true);

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return rows;
    const getter = col.sortValue;
    return [...rows].sort((a, b) => {
      const va = getter(a);
      const vb = getter(b);
      if (va === vb) return 0;
      return (va < vb ? -1 : 1) * (asc ? 1 : -1);
    });
  }, [rows, columns, sortKey, asc]);

  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} detail={emptyDetail} />;
  }

  const cellPad = dense ? "px-3 py-2" : "px-4 py-3";

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse text-left">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr className="border-b border-border bg-strip">
            {columns.map((col) => {
              const sortable = Boolean(col.sortValue);
              const active = sortKey === col.key;
              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={active ? (asc ? "ascending" : "descending") : sortable ? "none" : undefined}
                  className={cn("eyebrow font-medium", cellPad, col.align === "right" && "text-right", col.className)}
                >
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (active) setAsc((v) => !v);
                        else {
                          setSortKey(col.key);
                          setAsc(true);
                        }
                      }}
                      className="inline-flex items-center gap-1 uppercase tracking-[inherit] transition-colors hover:text-text"
                    >
                      {col.header}
                      <span aria-hidden className={cn("text-[9px]", !active && "opacity-30")}>
                        {active && !asc ? "▼" : "▲"}
                      </span>
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                "border-b border-border/60 last:border-b-0",
                onRowClick && "cursor-pointer transition-colors hover:bg-blue-tint",
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "font-body text-[13.5px] leading-[20px] text-text align-top",
                    cellPad,
                    col.align === "right" && "text-right",
                    col.className,
                  )}
                >
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
