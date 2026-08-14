---
name: meeting-to-actions
description: Turn a meeting transcript or set of notes into decisions, owners, dates and drafted follow-ups. Use when the user supplies a transcript, recording notes, or asks what was decided in a meeting.
---

# meeting-to-actions

A transcript is not a record. It is raw material with the decisions buried inside
it, half the owners implied rather than stated, and at least one thing everybody
agreed to that nobody actually agreed to do. Your job is to produce the record —
and to be honest about the gaps rather than smoothing them over.

## When this fires

Run when any of these is true:

- A file lands in `_inbox/` that reads as a transcript, meeting notes, or a
  recording summary.
- The user says some version of "what did we decide", "turn this into actions",
  "write up the meeting", "send the follow-ups".
- A calendar-connected meeting ends and the user asks for the write-up.

Do **not** run on: a one-to-one chat log, a document that is merely long, or
anything the user described as a draft they are still writing.

## HOW TO INTERROGATE THE USER

This is the core of the skill. A write-up produced without interrogation is a
summary, and summaries get rewritten. Ask before you write.

**First, resolve the profile. Never ask twice.**

Before asking anything, check `vault/00-maps/profile/` for each question below.

| State | What you do |
|---|---|
| Known | Use it. Do not ask. **State the assumption**: "Using your usual owner-and-date format — say if not." |
| Stale | One-tap confirm, not re-interrogation: "Still sending follow-ups from your own address?" |
| Unknown | Ask properly, using the questions below. |

Interrogation depth decays. Session one asks six questions; session twenty asks
one. If the system does not visibly get easier to use, this skill is failing.

**The questions, in order. Stop as soon as the material has surfaced.**

1. **Who was actually in the room?**
   Not the invite list. Ask who spoke, and who was on the call but silent —
   silence in a decision meeting is data.

2. **What was this meeting for?**
   Ask for the one sentence they would have used beforehand. Then ask whether
   that is what actually happened. The gap between the two is usually the real
   story.

3. **Which decision was the hard one?**
   Never ask "what was decided" — you will get the agenda back. Ask which one
   was argued about, or which one they are least sure of this morning. That is
   the decision that needs the clearest write-up.

4. **What got agreed with no owner?**
   Ask directly: "Was there anything everyone nodded at that nobody actually
   picked up?" People recognise this instantly and will name it.

5. **What can't go in writing?**
   Ask what they would not want forwarded. Some meetings contain a personnel
   judgement, a competitor read, or a number that should not leave the room. If
   they name something, it stays out of the artifact entirely — not softened,
   out.

6. **Who receives this, and what do you want them to do?**
   A write-up going to the board is a different document from one going to the
   two people who owe you work.

**Interrogate to derive — never placeholder.** If you need a date, an owner, or
a reason and it is not in the transcript, do not write `[TBD]` and do not ask a
flat "give me the date". Ask an angled question that gets there: "When does the
next thing downstream of this break if it slips?" Then derive the date yourself
and state it as derived.

**Then write once.** Do not produce a draft mid-interrogation.

## Constraints

- **Never invent an owner or a date.** An unowned action is written as unowned
  and listed under *Open threads*. That list is the most valuable part of the
  document and the part a summariser always loses.
- **Quote sparingly and exactly.** If you attribute a sentence to someone, it
  must be a real span from the transcript. Paraphrase everything else.
- **Cite the source span** for every decision, so anyone can go back and check.
- **Flag disagreement, never resolve it.** If two people stated conflicting
  facts, both go in the write-up. You are not the tie-breaker.
- **Confidence is explicit.** Mark each decision high / medium / low. Low means
  "this is my reading, check it."
- **No money figures** in the artifact or in any drafted follow-up.
- **Nothing is deleted.** The transcript stays in the vault, always.
- Prefer omission to invention, every time.

## Writing voice

Plain and short. Lowercase headings are fine; corporate register is not. No
"synergies", no "circle back", no "as discussed". Write the way the person in
the meeting would write to the person who missed it.

Follow-ups are drafted as if the user will send them in ninety seconds: one
subject line, three sentences, one ask, one date. No pleasantries stacked at the
top.

## Output

One markdown file at `outputs/meeting-to-actions/<date>-<slug>.md`, with these
sections in this order:

1. `# <meeting> — decisions and actions`
2. `## Decisions` — one line each, with owner and confidence
3. `## Actions` — checkbox list, `owner — action — due date`
4. `## Open threads` — everything unowned, undecided, or disputed
5. `## Drafted follow-ups` — one block per recipient
6. `## Sources` — source file plus byte span for each decision

See `references/good-output.md` for a worked example, and
`fixtures/sample-transcript.md` for an input you can run against.
