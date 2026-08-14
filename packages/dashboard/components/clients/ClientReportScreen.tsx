"use client";

/**
 * CHANNELS — one generated report, rendered.
 *
 * The screen performs no analysis. A skill run in Claude chat reads a client's
 * notes and writes a JSON report; this draws the newest one and omits every
 * section that report does not carry. See `ClientReport` for why the split is
 * that way round.
 *
 * Its own route rather than a dashboard module: the home dashboard answers "is
 * anything wrong", and this answers "how is the channel doing" — a different
 * question, asked at a different time, needing a full page.
 */

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ClientReport } from "cortexos-types";
import { ds } from "@/lib/data";
import { useAsync } from "@/lib/use-async";
import { EmptyState, ErrorState, SkeletonLines } from "@/components/ui";
import { ClientRail } from "./ClientRail";
import { ReportHeader } from "./ReportHeader";
import { HeroBand } from "./HeroBand";
import { MetricSpine } from "./MetricSpine";
import { PowerLaw } from "./PowerLaw";
import { Findings } from "./Findings";

export function ClientReportScreen({ id }: { id?: string }) {
  const router = useRouter();
  const { data, error, loading, reload } = useAsync<ClientReport[]>(() => ds.listClients());

  // Same gate as the dashboard: no session means sign in, not an error the
  // reader cannot act on.
  useEffect(() => {
    if (error?.code === "unauthorized") router.replace("/sign-in");
  }, [error, router]);

  /*
   * THIS PAGE IS A DOCUMENT, AND THE APP AROUND IT IS NOT.
   *
   * `globals.css` pins `html, body { height: 100% }` and the layout adds
   * `h-full` to both, because the dashboard is a fixed 100vh shell that must
   * never scroll. A long report is the opposite: it has to scroll the window.
   *
   * That combination survives only while nothing else touches overflow — and
   * something does. `Dialog` sets `document.body.style.overflow = "hidden"` and
   * restores the value it captured on mount; a dialog unmounted by a route
   * change (or a second dialog opening over a first) can restore "hidden" and
   * leave the next page unable to scroll at all, with no error and nothing on
   * screen to explain it.
   *
   * So this page states its own contract instead of inheriting one: auto
   * height, visible overflow, restored exactly on unmount so the dashboard
   * shell gets its fixed viewport back.
   */
  useEffect(() => {
    const html = document.documentElement;
    const { body } = document;
    const previous = {
      htmlHeight: html.style.height,
      htmlOverflow: html.style.overflow,
      bodyHeight: body.style.height,
      bodyOverflow: body.style.overflow,
    };
    html.style.height = "auto";
    html.style.overflow = "visible";
    body.style.height = "auto";
    body.style.overflow = "visible";
    return () => {
      html.style.height = previous.htmlHeight;
      html.style.overflow = previous.htmlOverflow;
      body.style.height = previous.bodyHeight;
      body.style.overflow = previous.bodyOverflow;
    };
  }, []);

  const reports = data ?? [];
  // An unknown id falls back to the newest report rather than a 404 — a stale
  // bookmark should still show something useful.
  const report = (id ? reports.find((entry) => entry.id === id) : undefined) ?? reports[0];
  const generatedAt = reports[0]?.generatedAt;

  if (loading) {
    return (
      <main className="min-h-screen bg-bg p-8">
        <SkeletonLines rows={8} />
      </main>
    );
  }

  if (error && error.code !== "unauthorized") {
    return (
      <main className="min-h-screen bg-bg p-8">
        <ErrorState error={error} onRetry={reload} />
      </main>
    );
  }

  if (!report) {
    return (
      <main className="flex min-h-screen flex-col gap-4 bg-bg p-8">
        <EmptyState
          title="No client reports yet"
          /*
           * Names the skill and the folder, because that is the fix. A person
           * reading this has to know a report is something you generate, not
           * something that arrives.
           */
          detail="Reports are written by the `client-report` skill into the vault's Proof/reports folder, one per client. Run it in Claude chat for a client, then reload."
        />
        <Link href="/" className="t-body-sm text-blue hover:text-blue-hover">
          ← Dashboard
        </Link>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen bg-bg text-text">
      <ClientRail reports={reports} activeId={report.id} generatedAt={generatedAt} />
      <main className="flex min-w-0 flex-1 flex-col">
        <ReportHeader report={report} reports={reports} />
        <HeroBand report={report} />
        <MetricSpine metrics={report.metrics} />
        <PowerLaw report={report} />
        <Findings findings={report.findings} />
        {/*
          Run-out space. Without it the last finding sits flush against the
          footer and the page reads as cut off rather than finished — the owner
          described it as "ending abruptly", and mistook it for a scroll fault.
          A document needs somewhere for the eye to land after the last line.
        */}
        <div className="h-10 lg:h-16" />
        <footer className="mt-auto flex flex-col gap-2 border-t border-border bg-paper px-[18px] pt-4 pb-10 lg:px-10 lg:pt-5 lg:pb-14">
          {report.source ? (
            <span className="text-eyebrow text-[10px] tracking-[0.06em] text-text-dim lg:text-[11px]">
              Source — {report.source}
            </span>
          ) : null}
          {/*
           * Every note the skill read. This is what makes a figure on this
           * screen checkable: no live feed stands behind these numbers, so the
           * provenance has to be on the page itself.
           */}
          {report.sourceNotes.length > 0 ? (
            <span className="t-body-sm text-[12px] text-text-dim">
              Read from {report.sourceNotes.join(", ")}
            </span>
          ) : null}
        </footer>
      </main>
    </div>
  );
}
