---
name: source-digest
description: Turn one ingested item — a video, article, PDF, podcast or voice note — into a source node plus the typed edges into whatever it actually changed. Use after something lands in the inbox, or when the user says "digest this", "what's in this", "add this to the brain".
---

# source-digest

Something arrives: a two-hour video, a forty-page PDF, a voice note from a walk.
The lazy outcome is a summary — a note nobody opens again, sitting unconnected in
a folder. A summary is a dead end. It adds a file and zero edges, and a second
brain with no edges is a folder.

What you produce instead is a **source node** that records what arrived, plus
**typed edges into the notes it actually changed**. The digest is the cheap part.
The connections are the product.

## When this fires

Run when any of these is true:

- A file lands in `_inbox/` and has been converted.
- The user says "digest this", "what's in this", "add this to the brain", "what
  did I learn from this".
- A source node exists but has no outbound edges — it was captured and never
  wired.

Do **not** run on: something the user wrote themselves (that is a fact note, not
a source), or a file they dropped in purely for storage and said so.

## HOW TO INTERROGATE THE USER

Short interrogation here — most of the material is in the item itself. What you
cannot get from the item is *why it mattered to them*, and that is the half that
determines every edge you write.

**First, resolve the profile. Never ask twice.**

| State | What you do |
|---|---|
| Known | Use it. State the assumption: "Filing this the way you file research — say if not." |
| Stale | One-tap confirm. |
| Unknown | Ask. |

**The questions, in order. Stop as soon as the material has surfaced.**

1. **Why did you save this?**
   Ask before you read anything back to them. The answer is almost never "it was
   interesting" — it is usually a specific thing they are chewing on, and that
   thing is where the edges point.

2. **What did you already believe about this?**
   You need the prior to know whether this item confirmed it, sharpened it or
   broke it. Those are three different edges.

3. **Which part made you stop?**
   Not the summary — the moment. People remember one passage. That passage is
   usually the only part that will ever matter.

4. **What are you going to do differently, if anything?**
   If nothing, say so in the node. A source that changed no behaviour and no
   belief is still worth recording, and pretending otherwise inflates the graph
   with edges that are not real.

**Interrogate to derive — never placeholder.** If you need the connection to an
existing note and they have not named one, do not write `[link]`. Ask: "what does
this sit next to in your head?" Then derive the edge yourself.

**Then write once.**

## Constraints

- **Cite by span.** Every claim attributed to the source carries the location it
  came from — timestamp for audio and video, page for a PDF, byte span for text.
  A digest without spans cannot be checked, and an unchecked digest gets trusted
  and then found wrong.
- **The source's claims are the source's.** Never merge them into the user's own
  notes as if they were the user's. `feeds::` an existing note; do not silently
  rewrite it.
- **Disagreement is an edge, not a problem.** If the item contradicts an existing
  note, write `contradicts::` and leave both standing.
- **Low-confidence connections are proposed, not asserted.** If you are not sure
  two things connect, write the edge as proposed and let the user confirm it.
- **Nothing is deleted.** The converted item stays in the vault, always. So does
  the original where the format allows.
- **No money figures** in any artifact.
- Prefer omission to invention, every time.

## Writing voice

Plain and short. The digest is notes-to-self, not a review. No "the author
argues that". No rating, no verdict, no recommendation — unless the user gave
one, in which case it is quoted as theirs.

## Output

1. **One source node** at the vault's sources location, named after the item, with
   frontmatter recording medium, origin, date captured, and duration or length.
   Body is: why it was saved, the three-to-six things in it worth keeping, and
   the one passage that made them stop — quoted exactly, with its span.

2. **Typed edges from that node into the graph.** This is the part that matters:
   - `feeds::` every existing note it added to
   - `contradicts::` anything it argues against
   - `proves::` / `proven-by::` where it supplies evidence for a claim already
     held
   - reciprocals written on the other side, always

3. **Where it changed a belief**, update that note too — and say in the source
   node which note changed and how.

A source node with no outbound edges is an incomplete run. If the item genuinely
connected to nothing, say that explicitly in the node rather than leaving it
looking unfinished.

See `references/good-output.md` for a worked example.
