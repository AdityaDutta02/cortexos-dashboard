---
name: grill-me
description: Interrogate the user on a topic they know but have never written down, then turn what surfaces into fact notes and typed edges. Use when the user says "grill me", "quiz me on X", "get this out of my head", or when a note is thin on something they clearly know well.
---

# grill-me

Most of what a person knows is not in their vault. It is in their head, unwritten
because it never felt like a thing worth writing — the rule of thumb, the reason
they stopped doing something, the number they check first, the client they would
not take again. That knowledge is the highest-value content in a second brain and
the least likely to arrive on its own.

This skill gets it out by asking. Not by summarising, not by prompting for an
essay — by interrogation, one sharp question at a time, until something the user
did not plan to say comes out.

## When this fires

Run when any of these is true:

- The user says "grill me", "grill me on X", "quiz me", "interview me", "get this
  out of my head".
- A note exists on a topic the user clearly has depth in, but reads like a
  definition rather than experience.
- The user has just made a decision and there is no record of *why*.

Do **not** run when: the user asked a question and wants an answer, or the topic
is one they are still deciding — interrogating an unformed view produces a
confident record of a position they will abandon next week.

## HOW TO INTERROGATE THE USER

This skill is nothing but interrogation, so the rules are stricter here than
anywhere else.

**First, resolve the profile. Never ask twice.**

| State | What you do |
|---|---|
| Known | Use it. Do not ask. State the assumption: "Sticking to the terms you normally use — say if not." |
| Stale | One-tap confirm: "Still true that you don't take retainer work?" |
| Unknown | Ask properly. |

**Pick ONE topic and stay on it.** A session that covers four topics produces four
shallow notes. Ask the user to name the topic, or propose one from a thin note and
get a yes.

**The question ladder. Go down it, not across it.**

1. **Start with what they did, not what they think.**
   "What was the last time you did X?" Concrete beats abstract every time. A
   person will give you a vague principle and a precise story; take the story.

2. **Then ask for the decision inside it.**
   "What did you choose there, and what was the other option?" A decision with no
   discarded alternative is a description, not a decision.

3. **Then ask what it cost.**
   "What did that cost you?" Time, money, a relationship, a rewrite. Cost is what
   makes a rule real, and it is the part people leave out.

4. **Then push on the rule.**
   "Would you do the same thing again at twice the size?" This is where a stated
   principle either becomes conditional or reveals itself as a habit rather than
   a rule.

5. **Then hunt the exception.**
   "When has that not worked?" If they cannot name one, the rule is untested and
   must be recorded as untested.

6. **Then ask what they cannot defend.**
   "What do you do that you would struggle to justify to someone smarter than
   you?" This question produces the single best material in most sessions. Ask it
   late, never first.

**Rules of the interrogation itself:**

- **One question per turn.** A stacked question gets one answer and loses the
  rest.
- **Never ask flat.** Not "what are your principles about hiring". Angled:
  "who was the last person you didn't hire, and what stopped you?"
- **Follow the flinch.** If an answer gets shorter, vaguer, or hedged, that is
  the thread. Ask again, narrower.
- **Do not teach.** No opinions, no suggestions, no "that's interesting because".
  The moment you contribute, they start responding to you instead of thinking.
- **Stop at the ceiling.** When two consecutive answers add nothing new, end it.
  A session that overstays produces padding the user then has to delete.
- **Derive, never placeholder.** If a date, number or name is missing, ask an
  angled question that gets to it. Never write `[TBD]`.

**Then write once**, at the end. Never mid-session — a note written at question
three shapes questions four through six.

## Constraints

- **Their words, not yours.** Where they said something well, quote it exactly.
  Paraphrase only to shorten, never to improve.
- **Separate what they know from what they assume.** Anything asserted without a
  supporting instance is written as an assumption and marked as one.
- **A rule with no named exception is written as untested.** Do not upgrade it.
- **Contradictions are recorded, not resolved.** If today's answer conflicts with
  an existing note, both stay and the tension is written down. You are not the
  tie-breaker.
- **Nothing is deleted.** Existing notes are extended, never overwritten.
- **No money figures** in any artifact.
- Prefer omission to invention, every time.

## Writing voice

Plain and short. Their register, not a report's. If they say "we just kill it",
the note says "we just kill it" — not "the initiative is discontinued".

## Output

Two things, in this order:

1. **Fact notes.** One note per distinct thing that surfaced, in the right folder
   for its role. Each gets an `## Edges` section with typed relations to what it
   connects to, and reciprocals on the other side. A session that produces five
   notes and no edges has produced nothing — the edges are the value.

2. **One decision record** per judgement call that surfaced, capturing what was
   chosen, what was rejected, and what it cost. This is the part that cannot be
   reconstructed later from anything else.

Then a short session summary in chat only: what surfaced, what contradicted
something existing, and what you did not get to. Do not write the summary into
the vault — the notes are the artifact.

See `references/session-shape.md` for a worked session.
