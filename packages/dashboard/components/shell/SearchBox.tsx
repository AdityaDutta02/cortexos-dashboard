"use client";

import { useEffect, useRef, useState } from "react";
import type { SearchHit } from "cortexos-types";
import { ds } from "@/lib/data";
import { reportSearchIndex } from "@/lib/index-status";
import { DegradedNotice, UncitedNotice } from "@/components/search/DegradedNotice";
import { basename } from "@/lib/format";
import { Dot } from "@/components/ui";

/**
 * The top bar's centre. Type, see hits, press one — that opens the detail
 * view. There is no search results page, because search results are a way to
 * reach a file, not a destination.
 *
 * Each hit is one line: tier dot · title · filename. The citation and score
 * that the old Search screen would have spelled out are in the title attribute.
 */
export function SearchBox({ onOpen }: { onOpen: (path: string) => void }) {
  const [query, setQuery] = useState("");
  // Results are tagged with the query that produced them, so "no results yet"
  // is derived rather than cleared by an effect.
  const [results, setResults] = useState<{
    query: string;
    hits: SearchHit[];
    degraded: boolean;
    searched: boolean;
    error: string | null;
  }>({ query: "", hits: [], degraded: false, searched: false, error: null });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const term = query.trim();
  const current = results.query === term;
  const hits = current ? results.hits : [];
  const degraded = current && results.degraded;
  const searched = current && results.searched;
  const error = current ? results.error : null;

  useEffect(() => {
    if (term.length === 0) return;
    let cancelled = false;
    const t = window.setTimeout(() => {
      setBusy(true);
      ds.search({ query: term, limit: 6 })
        .then((r) => {
          if (cancelled) return;
          // Every response updates the index verdict, healthy ones included.
          reportSearchIndex(Boolean(r.degraded), r.hits.length);
          setResults({
            query: term,
            hits: r.hits,
            degraded: Boolean(r.degraded),
            searched: true,
            error: null,
          });
          setActive(0);
        })
        .catch((e: unknown) => {
          if (cancelled) return;
          setResults({
            query: term,
            hits: [],
            degraded: false,
            searched: true,
            error: e instanceof Error ? e.message : "Search is unavailable.",
          });
        })
        .finally(() => {
          if (!cancelled) setBusy(false);
        });
    }, 140);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [term]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const choose = (hit: SearchHit) => {
    onOpen(hit.path);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={boxRef} className="relative w-full max-w-[560px]">
      <input
        type="search"
        value={query}
        placeholder="Search"
        aria-label="Search everything"
        data-testid="search-input"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.min(hits.length - 1, i + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(0, i - 1));
          } else if (e.key === "Enter") {
            const hit = hits[active];
            if (hit) choose(hit);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="t-body h-8 w-full border border-border bg-strip px-3 text-text placeholder:text-text-dim focus:border-blue focus:bg-bg"
      />

      {open && term.length > 0 && (searched || busy || error) ? (
        <div className="animate-fade-up absolute top-[calc(100%+6px)] left-0 z-60 w-full border border-border-strong bg-bg shadow-[0_18px_44px_-20px_rgba(0,0,0,0.55)]">
          {degraded ? <DegradedNotice hitCount={hits.length} /> : null}

          {error ? (
            <p role="alert" className="t-body-sm border-b border-border bg-danger-tint px-3.5 py-3 text-text">
              {error}
            </p>
          ) : null}

          {busy && hits.length === 0 ? (
            <p className="t-body-sm px-3.5 py-3 text-text-muted">Searching…</p>
          ) : null}

          {!busy && !error && searched && hits.length === 0 ? (
            <p className="t-body-sm px-3.5 py-3 text-text-muted">
              Nothing matched “{term}”.
            </p>
          ) : null}

          <ul data-testid="search-results">
          {hits.map((hit, i) => (
            <li key={hit.id}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(hit)}
                title={`${hit.citation.label} · ${hit.citation.sourceDate}`}
                className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
                  i === active ? "bg-blue-tint" : ""
                }`}
              >
                <Dot tone={hit.tier === 2 ? "blue" : "neutral"} size={7} />
                <span className="t-body min-w-0 flex-1 truncate text-text">{hit.title}</span>
                {hit.proposed ? <span className="eyebrow shrink-0 text-warn">proposed</span> : null}
                {hit.citation?.sourceFile ? null : <UncitedNotice />}
                <span className="t-mono max-w-[36%] truncate text-text-dim">
                  {basename(hit.path)}
                </span>
              </button>
            </li>
          ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
