"use client";

import { useState } from "react";
import type { PowerBand, ClientReport } from "cortexos-types";

const toneFill: Record<PowerBand["tone"], string> = {
  primary: "bg-blue text-on-blue",
  soft: "bg-blue-soft text-on-blue",
  pale: "bg-blue-pale text-text",
  rest: "bg-blue-paper text-text-muted",
};

const restLabelTone: Record<PowerBand["tone"], string> = {
  primary: "text-text",
  soft: "text-text-muted",
  pale: "text-text-muted",
  rest: "text-text-dim",
};

const PREVIEW_ROWS = 3;

/**
 * How concentrated the channel is, and the videos behind it.
 *
 * Renders only when the report carries the section — a channel whose notes have
 * no ranking (it happens) simply does not get this block.
 */
export function PowerLaw({ report }: { report: ClientReport }) {
  const [expanded, setExpanded] = useState(false);
  const powerLaw = report.powerLaw;
  if (!powerLaw || powerLaw.bands.length === 0) return null;

  const { caption, bands, videos, videoCount } = powerLaw;
  const rows = expanded ? videos : videos.slice(0, PREVIEW_ROWS);
  const maxShare = Math.max(...bands.map((band) => band.share));
  const hasCtr = videos.some((video) => video.ctr);
  const hasSubs = videos.some((video) => video.subs);

  return (
    <section className="flex flex-col gap-[18px] border-b border-border px-[18px] py-[26px] lg:gap-[22px] lg:px-10 lg:py-10">
      <div className="flex flex-col gap-1 lg:flex-row lg:items-baseline lg:justify-between lg:gap-6">
        <h2 className="text-card-title text-text lg:text-heading-sm">The channel power law</h2>
        <span className="t-body-sm text-text-muted">{caption}</span>
      </div>

      {/* Desktop: one continuous bar, each band sized by its own share. */}
      <div className="hidden h-[52px] border border-border lg:flex">
        {bands.map((band) => (
          <div
            key={band.label}
            style={{ width: `${band.share}%` }}
            className={`text-mono-sm flex items-center overflow-hidden px-3.5 whitespace-nowrap ${toneFill[band.tone]}`}
          >
            {band.label} · {band.caption}
          </div>
        ))}
      </div>

      {/* Mobile: stacked rows, scaled to the largest band so the small ones stay readable. */}
      <div className="flex flex-col gap-2.5 lg:hidden">
        {bands.map((band) => (
          <div key={band.label} className="flex items-center gap-3">
            <span className={`text-mono-sm w-14 shrink-0 ${restLabelTone[band.tone]}`}>
              {band.label}
            </span>
            <div className="bg-blue-paper flex h-[26px] flex-1">
              <div
                style={{ width: `${Math.round((band.share / maxShare) * 100)}%` }}
                className={`text-mono-sm flex items-center px-2.5 ${toneFill[band.tone]}`}
              >
                {band.caption}
              </div>
            </div>
          </div>
        ))}
      </div>

      {videos.length > 0 ? (
        <div className="flex flex-col border border-border">
          {rows.map((row, index) => {
            const lead = index === 0;
            return (
              <div
                key={row.rank}
                className={
                  lead
                    ? "flex flex-col gap-2 border-b border-border bg-blue-tint px-3.5 py-3.5 lg:flex-row lg:items-center lg:gap-4 lg:px-4"
                    : "border-panel-border flex flex-col gap-2 border-b px-3.5 py-3.5 lg:flex-row lg:items-center lg:gap-4 lg:px-4"
                }
              >
                <div className="flex gap-2.5 lg:flex-1 lg:items-center lg:gap-4">
                  <span
                    className={
                      lead
                        ? "text-mono-sm w-6 shrink-0 text-blue"
                        : "text-mono-sm w-6 shrink-0 text-text-dim"
                    }
                  >
                    {row.rank}
                  </span>
                  <span className={lead ? "t-body-sm font-semibold text-text" : "t-body-sm text-text"}>
                    {row.title}
                  </span>
                </div>
                <div className="flex gap-4 pl-[34px] lg:gap-4 lg:pl-0">
                  <span className="text-mono-sm text-text-muted lg:w-20 lg:text-right lg:text-text">
                    {row.views}
                    <span className="lg:hidden"> views</span>
                  </span>
                  {/* A column only exists when some row actually fills it. */}
                  {hasCtr ? (
                    <span className="text-mono-sm text-text-muted lg:w-14 lg:text-right lg:text-text">
                      {row.ctr ?? "—"}
                      <span className="lg:hidden"> CTR</span>
                    </span>
                  ) : null}
                  {hasSubs ? (
                    <span
                      className={
                        lead
                          ? "text-mono-sm font-medium text-blue lg:w-[70px] lg:text-right"
                          : "text-mono-sm text-text-muted lg:w-[70px] lg:text-right lg:text-text"
                      }
                    >
                      {row.subs ?? "—"}
                      <span className="lg:hidden"> subs</span>
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}

          {/*
           * The design's button read "Show all 331 videos" and then revealed
           * ten, because the report holds a top-N table while `videoCount` is
           * the whole window. It now names the number of rows that exist, and
           * says separately how many videos the window held.
           */}
          {videos.length > PREVIEW_ROWS ? (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="text-button flex items-center justify-center py-3 text-blue hover:bg-blue-tint"
            >
              {expanded ? `Show top ${PREVIEW_ROWS} only` : `Show all ${videos.length} ranked`}
            </button>
          ) : null}
        </div>
      ) : null}

      {videoCount ? (
        <span className="t-body-sm text-text-dim">
          {videos.length} ranked of {videoCount} videos in the window.
        </span>
      ) : null}
    </section>
  );
}
