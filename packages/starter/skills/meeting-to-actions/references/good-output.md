# Worked example — what good looks like

This is the standard. Note four things about it: every decision carries an owner
and a confidence, the *Open threads* section is not empty, nothing is invented,
and the follow-ups are short enough to send without editing.

---

# Pricing review — decisions and actions

## Decisions

- Ship the tiered plan in October, not September. (owner: Priya · confidence: high)
- Keep the onboarding call mandatory for every new account. (owner: Rahul · confidence: high)
- Stop running the two comparison pages in parallel; consolidate to one. (owner: Priya · confidence: medium — agreed verbally, no date set)

## Actions

- [ ] Priya — rewrite the plan comparison page against the single-page decision — due 2026-08-17
- [ ] Rahul — brief support on the October timing before the next release note — due 2026-08-14
- [ ] Priya — confirm with design whether the pricing table survives the consolidation — due 2026-08-15

## Open threads

- **Nobody owns the migration email.** Three people referred to "the email going
  out" and none of them claimed it. This is the most likely thing to be dropped.
- **Disagreement, unresolved:** Rahul said existing accounts keep their current
  plan indefinitely; Priya said they migrate at renewal. Both are in the
  transcript. Someone needs to pick.
- The October date assumes the design review lands on time. No one said what
  happens if it does not.

## Drafted follow-ups

**To: Priya**
Subject: comparison page — one page, not two

We agreed to consolidate to a single comparison page. Can you confirm the
pricing table survives that, and get the rewrite in by the 17th? If design pushes
back, tell me before the 15th so the October date does not move quietly.

**To: Rahul**
Subject: October timing — support brief

The tiered plan ships in October. Support needs to hear it from you before the
next release note goes out, so the 14th. One paragraph is enough.

**To: both**
Subject: the migration email nobody owns

This came up three times and no one picked it up. One of you needs to. Also: you
gave different answers on whether existing accounts migrate at renewal. Please
settle that before the email is written, not after.

## Sources

- `_inbox/2026-08-10-pricing-review.txt` (bytes 0–1180) — October decision
- `_inbox/2026-08-10-pricing-review.txt` (bytes 1180–2640) — onboarding call
- `_inbox/2026-08-10-pricing-review.txt` (bytes 2640–4820) — consolidation, and the migration disagreement

---

## Why this passes

- **The open threads are the product.** A summary that lists only what was
  decided is worth less than one that names what was quietly dropped.
- **The disagreement is preserved.** Rahul and Priya contradicted each other.
  The document says so and does not pick a winner.
- **Confidence is marked.** The consolidation decision is medium, and the
  reason is stated.
- **Every decision is traceable** to a byte span in the source file.
- **The follow-ups are sendable.** No preamble, one ask each, a date each.

## Why a bad version fails

A bad version reads: *"The team discussed pricing and aligned on an October
launch, with next steps to be confirmed."* It invents the word "aligned", loses
the disagreement, has no owners, no dates, no sources, and could describe any
meeting at any company. The user rewrites it, which is the signal that this
skill needs tuning.
