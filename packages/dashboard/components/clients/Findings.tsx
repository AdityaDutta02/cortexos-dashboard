import type { ReportFinding } from "cortexos-types";

/**
 * The analysis. Each finding leads with its number, where it has one.
 *
 * The design assumed every finding carried a pull figure. Some are qualitative
 * — "check the job before calling this a fail" has no number and inventing one
 * would be the worst kind of confident. Those render full-width instead.
 */
export function Findings({ findings }: { findings: ReportFinding[] }) {
  if (findings.length === 0) return null;

  return (
    <section className="flex flex-col gap-6 px-[18px] pt-[26px] pb-10 lg:gap-7 lg:px-10 lg:pt-10 lg:pb-14">
      <h2 className="text-card-title text-text lg:text-heading-sm">What the numbers say</h2>
      <div className="flex flex-col gap-6 lg:gap-8">
        {findings.map((finding) => (
          <div
            key={finding.title}
            className="flex flex-col gap-2.5 border-l-2 border-blue pl-3.5 lg:flex-row lg:gap-8 lg:border-l-0 lg:pl-0"
          >
            {finding.figure ? (
              <div className="flex items-baseline gap-2.5 lg:w-[200px] lg:shrink-0 lg:flex-col lg:items-start lg:gap-1.5 lg:border-l-2 lg:border-blue lg:pl-4">
                <span className="text-pull-figure text-text">{finding.figure}</span>
                {finding.figureCaption ? (
                  <span className="t-body-sm text-[12px] text-text-muted lg:text-[13px]">
                    {finding.figureCaption}
                  </span>
                ) : null}
              </div>
            ) : (
              // No number: keep the rule so the column still reads as a list.
              <div className="hidden w-[200px] shrink-0 lg:block lg:border-l-2 lg:border-border" />
            )}
            <div className="flex flex-col gap-2 lg:flex-1">
              <h3 className="text-card-title text-[16px] text-text lg:text-[17px]">
                {finding.title}
              </h3>
              <p className="t-body-sm text-text-muted lg:t-body">{finding.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
