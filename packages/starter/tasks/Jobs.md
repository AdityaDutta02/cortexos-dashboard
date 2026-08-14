---
tags: [maps, jobs]
type: task-list
---

# Jobs

**This file is your task list, and it is the real one.** CORTEX reads it: every
`##` heading below becomes a job it can run, from a dashboard button, from chat,
or on a clock. You author jobs here in plain English; the dashboard performs
them. There is no second list anywhere else, and there must never be one — two
lists of what a system does, neither aware of the other, is how you end up with
a morning brief that reports on the system's own hygiene while its real
specification sits unread.

**The prose IS the prompt**, verbatim. Write it the way you would explain the job
to a competent person joining on Monday. Only three lines are machine-read:

```
writes::  where the output file goes; omit if the job produces no file
needs::   capabilities the job requires — it is not offered if these are missing
uses::    skills the job should run through
```

A heading with no `writes::` is still a job. Nothing here can stop CORTEX from
starting: an unparseable file yields no jobs and logs why.

Three jobs ship as a starting point. **Change them.** They are shaped to be
useful on day one and obvious to edit — the point is that within a month this
file looks nothing like what was handed to you.

---

## morning brief

Tell me what today actually needs from me, in under a minute of reading.

Start with anything that is time-bound today — commitments made, things due,
anything I said I would do by a date that has now arrived. Pull those from the
vault, not from memory: if I wrote it down, it counts; if I did not, do not
invent it.

Then, and only then, tell me what moved since yesterday. New notes, new edges,
anything that landed in the inbox and got processed. Keep this to the things that
would change what I do today. A list of everything that happened is not a brief,
it is a log, and I already have a log.

Close with one thing I am avoiding. You will usually find it as something that
has been rewritten more than once, or referenced repeatedly without ever being
finished. Name it plainly and do not soften it.

Rules: no preamble, no greeting, no summary of the summary. If there is nothing
worth reporting, say that in one line — a brief that pads to look useful trains
me to stop reading it.

writes:: 20 Areas/Briefs/{date} Morning Brief.md

## weekly review

Once a week, tell me what actually moved and what quietly did not.

Work from the graph, not from my optimism. Compare this week against last: which
notes gained edges, which projects gained nothing, what got created and then never
touched again. A note created and abandoned inside the same week is a signal, not
noise — surface it.

Three sections, in this order.

**Moved.** What genuinely progressed, with the evidence — the notes, the edges,
the outputs. Not intentions.

**Stalled.** What I said I would do and did not, and how long it has been. Do not
be generous here. If something has been "in progress" for three weeks, write three
weeks.

**Contradictions.** Anything I asserted this week that conflicts with something I
had already written down. Both sides, no resolution. This is the most valuable
section and the one I will be most tempted to skip.

End with one question I should answer before next week. One. Make it the one I
would rather not think about.

writes:: 20 Areas/Reviews/{date} Weekly Review.md

## inbox sweep

Clear what is sitting in the inbox, properly rather than quickly.

For each item: convert it, digest it, wire it into the graph, and only then mark
it done. An item that got converted and never connected is not processed — it is
a file that moved folders. If a run is interrupted, resume from where it stopped;
never restart from the top and never re-process something already wired.

Where an item genuinely connects to nothing in the vault, say so explicitly in
its source node. Do not manufacture an edge to make the run look complete.

Where an item contradicts something I already believe, do not resolve it. Write
both down and flag the tension for me.

Report at the end: how many processed, how many edges written, how many items you
could not handle and exactly why. "Could not handle" is a useful answer; a silent
skip is not.

needs:: inbox
uses:: source-digest

---

## Writing your own

Copy the shape above. A good job says what the output is for, what to leave out,
and what "done" means. A bad one says "summarise my week" and gets you a summary
of your week.

Two things worth stealing from the three above:

- **Say what not to do.** Most of the quality in these jobs is in the negative
  instructions — no preamble, do not invent, do not resolve, do not soften.
- **Define the failure.** "A list of everything that happened is not a brief" does
  more work than three sentences describing what a brief is.
