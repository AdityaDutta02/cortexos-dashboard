"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { ArrowUpRight } from "lucide-react";
import type { ClientReport, TrendPoint } from "cortexos-types";

interface TooltipPayloadItem {
  payload: TrendPoint;
}

function TrendTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="text-mono-sm border border-blue bg-navy px-2.5 py-1.5 text-bg">
      <span className="text-navy-label">{point.label}</span>
      {/*
       * Printed as given. The design multiplied by 1000 because its fixture
       * stored thousands; a report states real values, and scaling them here
       * would silently inflate every tooltip on the screen.
       */}
      <span className="pl-2">{point.value.toLocaleString("en-US")} views</span>
    </div>
  );
}

/**
 * The one big number, the one sentence, and the shape of the window.
 *
 * Every part is optional. A report with no hero renders no band at all rather
 * than a band with a blank in it — see `ClientReport` on why absence is the
 * honest default here.
 */
export function HeroBand({ report }: { report: ClientReport }) {
  const { hero, headline, trend } = report;
  if (!hero && !headline && !trend?.length) return null;

  return (
    <section className="flex flex-col gap-5 bg-navy px-[18px] pt-[26px] text-bg lg:gap-7 lg:px-10 lg:pt-[38px]">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:gap-14">
        {hero ? (
          <div className="flex flex-col items-start gap-2 lg:gap-2.5">
            <span className="text-eyebrow text-navy-label">{hero.label}</span>
            <div className="flex flex-col items-start gap-3 lg:flex-row lg:items-end lg:gap-4">
              <span className="text-hero-figure-sm lg:text-hero-figure">{hero.value}</span>
              {/* No delta unless the report states one — never computed here. */}
              {hero.delta ? (
                <span className="text-mono-sm flex items-center gap-1 bg-blue px-2.5 py-1 lg:mb-2.5">
                  <ArrowUpRight strokeWidth={2} className="h-3.5 w-3.5" />
                  {hero.delta}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        {headline ? (
          <div className="flex flex-col gap-2 border-t border-navy-rule pt-4 lg:max-w-[340px] lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
            <span className="text-eyebrow text-navy-label">Headline</span>
            <p className="text-card-title text-[19px] leading-[1.3] lg:text-[21px]">
              {headline.lead}
              <span className="text-blue-soft">{headline.accent}</span>
              {headline.tail}
            </p>
          </div>
        ) : null}
      </div>

      <div className="h-24 w-full lg:h-[150px]">
        {trend?.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="heroFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0562ef" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#0562ef" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <YAxis hide domain={["dataMin", "dataMax"]} />
              <Tooltip content={<TrendTooltip />} cursor={{ stroke: "#5c9bff", strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#5c9bff"
                strokeWidth={2}
                fill="url(#heroFill)"
                dot={false}
                activeDot={{ r: 4, fill: "#5c9bff", stroke: "#001745", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyTrend />
        )}
      </div>
    </section>
  );
}

/**
 * The chart's slot when the report carries no trend.
 *
 * The band kept its full height either way — a client whose notes hold only
 * window totals should not get a visibly shorter, poorer-looking page than one
 * whose notes hold a monthly series. But the slot must not imply a reading, so
 * this draws NO line: a flat baseline, the same gradient wash, and a label
 * saying why it is empty. Anything curved here would be a chart of nothing,
 * which is the one thing a client report cannot show.
 */
function EmptyTrend() {
  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-blue/5 to-blue/20" />
      <div className="bg-navy-rule absolute inset-x-0 bottom-0 h-px" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-eyebrow text-navy-label">No period trend in this report</span>
      </div>
    </div>
  );
}
