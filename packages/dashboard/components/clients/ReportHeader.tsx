"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronDown } from "lucide-react";
import type { ClientReport } from "cortexos-types";

/**
 * Title, window, and the mobile client switcher.
 *
 * The design carried a green "LIVE" chip and a date-range dropdown. Both are
 * gone. Nothing here is live — a person runs a skill and a file appears — and
 * there is no second range to switch to, because a report covers exactly the
 * window its author chose. A control that cannot do anything, and a status
 * light that is not true, are the two ways a report screen loses trust.
 */
export function ReportHeader({
  report,
  reports,
}: {
  report: ClientReport;
  reports: ClientReport[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-border bg-bg">
      <div className="flex items-center justify-between px-[18px] py-3.5 lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          <span className="block h-3 w-3 bg-blue" />
          <span className="text-card-title text-[14px] text-text">Cortex</span>
        </Link>
        <GeneratedChip at={report.generatedAt} />
      </div>
      <div className="relative flex items-end justify-between gap-4 border-t border-border bg-paper px-[18px] py-3.5 lg:border-t-0 lg:bg-bg lg:px-10 lg:pt-[26px] lg:pb-[22px]">
        <div className="flex min-w-0 flex-col gap-1.5 lg:gap-[7px]">
          <div className="hidden items-center gap-2.5 lg:flex">
            <span className="text-eyebrow text-text-dim">
              {report.isClient === false ? "In-house channel" : "Channel performance"}
            </span>
            <GeneratedChip at={report.generatedAt} />
          </div>
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="flex items-center gap-2 text-left lg:cursor-default"
          >
            <h1 className="text-card-title truncate text-text lg:text-heading-sm">
              {report.reportTitle}
            </h1>
            <ChevronDown
              strokeWidth={1.5}
              className={`h-5 w-5 shrink-0 text-blue lg:hidden ${open ? "rotate-180" : ""}`}
            />
          </button>
          <span className="t-body-sm text-text-muted lg:hidden">
            {[report.agency, report.platform, report.range].filter(Boolean).join(" · ")}
          </span>
        </div>
        <div className="hidden items-center lg:flex">
          {report.range ? (
            <span className="t-body-sm border border-border bg-bg px-3.5 py-2.5 text-text">
              {report.range}
            </span>
          ) : null}
        </div>

        {open ? (
          <div className="absolute inset-x-0 top-full z-20 flex flex-col border-b border-border bg-bg lg:hidden">
            {reports.map((option) => (
              <Link
                key={option.id}
                href={`/clients/${option.id}`}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between gap-3 border-b border-panel-border px-[18px] py-3.5 last:border-b-0"
              >
                <span className="flex flex-col gap-0.5">
                  <span className="t-body-sm font-medium text-text">{option.client}</span>
                  <span className="t-body-sm text-[12px] text-text-muted">
                    {option.isClient === false
                      ? "In-house"
                      : [option.agency, option.platform].filter(Boolean).join(" · ")}
                  </span>
                </span>
                {option.id === report.id ? (
                  <Check strokeWidth={1.5} className="h-4 w-4 shrink-0 text-blue" />
                ) : null}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </header>
  );
}

/**
 * When this report was made — where the design put a "LIVE" light.
 *
 * These are hand-generated numbers with no feed behind them. The one thing a
 * reader must never do is assume they are current, so the date sits in the
 * most prominent chip on the screen rather than in a footnote.
 */
function GeneratedChip({ at }: { at: string }) {
  return (
    <span className="t-mono flex items-center gap-1.5 border border-border bg-blue-tint px-2 py-0.5 text-[10px] tracking-[0.06em] text-blue lg:text-[11px]">
      <span className="block h-1.5 w-1.5 rounded-full bg-blue" />
      GENERATED {at}
    </span>
  );
}
