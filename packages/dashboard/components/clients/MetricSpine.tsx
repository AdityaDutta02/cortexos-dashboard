import type { ReportMetric } from "cortexos-types";

/** The row of supporting numbers under the hero. */
export function MetricSpine({ metrics }: { metrics: ReportMetric[] }) {
  if (metrics.length === 0) return null;

  return (
    <section className="flex flex-wrap border-b border-border">
      {metrics.map((metric, index) => (
        <div
          key={metric.label}
          className={
            index === metrics.length - 1
              ? "flex w-1/2 flex-col gap-1 border-b border-border px-[18px] py-4 lg:w-auto lg:flex-1 lg:border-b-0 lg:px-6 lg:py-5"
              : "flex w-1/2 flex-col gap-1 border-r border-b border-border px-[18px] py-4 odd:border-r even:border-r-0 lg:w-auto lg:flex-1 lg:border-r lg:border-b-0 lg:px-6 lg:py-5"
          }
        >
          <span className="text-eyebrow text-[10px] tracking-[0.08em] text-text-dim lg:text-[11px]">
            {metric.label}
          </span>
          <span className="text-figure text-text lg:text-[26px]">{metric.value}</span>
          {/*
           * The delta line renders only when the report carries one. A report
           * whose notes state no comparison shows the figure alone rather than
           * a dash that reads as "flat".
           */}
          {metric.delta ? (
            <span
              className={
                metric.strong
                  ? "t-body-sm text-[12px] text-blue"
                  : "t-body-sm text-[12px] text-text-muted"
              }
            >
              {metric.delta}
            </span>
          ) : null}
        </div>
      ))}
    </section>
  );
}
