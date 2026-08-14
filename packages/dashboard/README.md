# `cortexos-dashboard` — the CORTEX dashboard

Next.js 16 (App Router) · React 19 · Tailwind v4 · TypeScript strict.
No component-library dependency; everything in `components/ui/` is hand-built.

## Run it

Against the **real system** — this is the normal path:

```bash
./cortex up          # from the repo root: pipeline check → agent :8787 → web :3000
```

Offline, on fixtures:

```bash
NEXT_PUBLIC_CORTEX_DATASOURCE=mock pnpm --filter cortexos-dashboard dev
```

```bash
pnpm --filter cortexos-dashboard build
pnpm --filter cortexos-dashboard lint
```

In mock mode you can force the error paths:

```
/?fail=home   /?fail=runs   /?fail=all   /?nodes=600
```

Scopes: `all home search graph notes runs sources profile config`.

## Transport — proxy, not CORS

`next.config.ts` rewrites `/api/*`, `/login` and `/logout` to the agent
(`CORTEX_AGENT_URL`, default `http://127.0.0.1:8787`). **The browser only ever
sees `:3000`.** That makes the httpOnly `cortex_session` cookie same-origin, so
there is no CORS, no preflight, no `credentials: "include"`, and no origin
allowlist. Verified in a browser: the only origin contacted is `localhost:3000`.

There is deliberately **no public API-base variable**. `NEXT_PUBLIC_CORTEX_DATASOURCE`
is a mode flag (`http` | `mock`, default `http`), not a URL. A cross-origin base
is exactly what this design rules out.

### Auth

The sign-in screen is at **`/sign-in`**, not `/login` — the agent owns
`POST /login` and the rewrite claims that path, so a page there would shadow the
endpoint the form posts to.

`/sign-in` first attempts a login with an empty password. On an open-dev
instance (`./cortex up`) that succeeds and you go straight in; on a
password-protected one it fails harmlessly and the form appears. A `401`
anywhere in the app routes here rather than dead-ending on an error card.

**The `Secure`-cookie trap:** with `CORTEX_ACCESS_PASSWORD` set, the cookie is
`Secure` and the browser silently discards it over plain `http://` — login
returns 200 and the next request 401s. The sign-in screen says this out loud,
because it reads like a wrong password and is not.

## The index-degraded warning

`SearchResult.degraded` had never been read by anything. It is now the most
prominent thing in the UI when it is true.

The bug that forced this: two concurrent index rebuilds collided, the index was
left half-built at 56 files of 544, and **search kept confidently answering from
the fragment** — eval recall fell 0.92 → 0.24 with nothing on screen to say so.
A confident wrong answer is the failure that ends the product, so this is the
one place the interface spends words rather than saving them.

- `lib/index-status.ts` remembers the verdict from the last search response.
  Every response updates it, healthy ones included.
- `components/search/DegradedNotice.tsx` renders a full-width block **above the
  results**, in prose: these results are from part of your vault, not all of it.
  Not a chip, not a tooltip.
- The health chip grows an `index` flag and the health popover leads with the
  warning.
- A hit that arrives without a usable citation is marked **`no source`** on the
  row — spec §6.4, if it can't cite it says so.

## The information architecture

**Two routes exist: `/` and `/styleguide`.** There is no nine-item nav, no
Search page, no Notes page, no Settings page. The app is one screen with two
views, and switching between them is local state — never navigation — so the
top bar and rails never reload and you never lose your place.

**View A — the workspace**

```
☰ │ health │        search        │ claude stats │ ☾
────────────────┬───────────────────────┬──────────────
 ingest         │                       │  tasks
 insights       │        GRAPH          │  connectors
 contradictions │                       │  skills
 output         │                       │
```

The graph is the centre and is always rendered. The six rails are compact
modules, not pages: each shows its state at a glance and expands in place.

**View A′** — `☰` slides a Profile/Settings drawer in on the far left; the
rails shift right and the graph narrows. Nothing navigates.

**View B** — anything clickable opens the side panel. The left column keeps the
graph (zoomed to the node, when the panel is showing one) over its
connected-node list; the right column is the panel.

**View A′** — `☰` opens a rail with two *separate* destinations, Profile and
Settings. Each opens as its own tab in the side panel.

## Type scale

Taken from the measured supermemory values (`docs/research/DESIGN_TOKENS.md`
plus the utilities the live page actually ships). Defined once in
`app/globals.css`, shown in full at `/styleguide`.

| Class | Size / line-height / tracking | Use |
|---|---|---|
| `.t-metric` | 32 / 34 / −1.2 · Space Grotesk 500 | the one big number in a module |
| `.t-title` | 22 / 28.6 / −0.66 · Space Grotesk 500 | side-panel title |
| `.t-subtitle` | 18 / 26 / −0.36 · Space Grotesk 500 | sub-heading in a panel |
| `.t-body-lg` | 16 / 26.4 / −0.08 · DM Sans | long-form prose, markdown |
| `.t-body` | 15 / 24 / −0.18 · DM Sans | **the default** — every primary rail row |
| `.t-body-sm` | 14 / 21 / −0.07 · DM Sans | secondary rows, issue lists |
| `.t-caption` | 13 / 19.5 · DM Sans | the floor for prose |
| `.t-mono-lg` | 13 / 18 · DM Mono | mono that carries content |
| `.t-mono` | 12 / 16 · DM Mono | counts, times, paths |
| `.eyebrow-lg` | 12 / 18 / 1.2 · DM Mono 500 | rail module header |
| `.eyebrow` | 11 / 16.5 / 1.54 · DM Mono 500 | labels only — never content |

**The rule: 11px mono is for labels only.** Anything a person reads starts at
13px. `.measure` caps prose at 68ch; the reference caps its own columns at 860px.

## Proportions

Rails are **300px**, the graph takes the rest (~806px at 1440). When the side
panel opens it takes `minmax(400px, 46%)` and the graph moves left. Rails were
210px in the previous round, which is what forced the type down in the first
place.

## The side panel — one slot, many content kinds

`lib/panel.ts` defines `PanelTarget`. When data does not fit its rail module,
the module does **not** shrink it — it becomes clickable and hands a target to
`components/panel/SidePanel.tsx`, which switches on `kind`:

`note` · `run` · `contradiction` · `contradictions` · `stale` · `health` ·
`connector` · `add-connector` · `skill` · `new-skill` · `task` ·
`new-task` (`mode?: button | routine`) · `profile` · `settings`

Adding a kind means adding a case and a small component, never a new layout.

## Visuals first — where the words went

Every former text section is now carried by a visual. The mapping:

| Was (text) | Is now (visual) |
|---|---|
| Headroom bar + caption + token ledger | Top-bar chip: a bar and a `%`. Ledger in the popover. |
| System health strip + issue sentences | Top-bar chip: a dot and one word. Issues in the popover. |
| Token-expiry banner across the page | The health dot goes amber and gains a `11d` mono chip. |
| "What needs a decision" list | **Red pulsing rings on the conflicting nodes**, plus one row per pair in `contradictions`. |
| "What's stale" list | **Dotted amber rings** on the graph; a count on the insights header. |
| "What the graph connected" paragraphs | One clause per row in `insights`; the nodes carry a blue halo. |
| Run rows with trigger sentences | One row: trigger glyph, status dot, label, `∴3` trickle count. |
| "Ran because you pressed a button" | The `▶` glyph. Sentence moved to its tooltip. |
| Connector health sentences | A dot per connector. Error text in the row's `title`. |
| Six named pipeline stages | Six micro-bars. Names in tooltips. |
| Belief rows with metadata | A statement and a confidence bar. Amber below the gate, struck through when superseded. |
| "Stop — it resumes from the last file" | A `◼` icon; resumability lives in its tooltip and in the pre-flight copy. |
| Relative times ("7 hours ago") | `7h` in rails. |
| Free-vs-paid pipeline argument (§5) | Grey bars run locally and cost nothing; blue bars spend Claude. A two-item key, no paragraph. |

The rule going forward: **before rendering a sentence, ask whether a dot, a
bar, a count, a colour, or a position on the graph says it instead.**

**Empty states draw nothing.** No dashed border, no grid overlay, no box: one
quiet line at `.t-body`, an optional `.t-caption` under it, left-aligned with
the rows that would have been there. The dashed-and-gridded version read as
broken layout rather than as an intentional empty state — a dashed frame with
grid lines inside it is the universal shape of "content failed to load".

**A dot beside text is `DotBullet`,** which sizes its wrapper to the exact
line-height of the neighbouring type and centres inside it. Six call sites had
hand-rolled this with three different margin guesses, none of which landed:
the wrapper forms its own line box, so the dot sat on *that* baseline and the
margin pushed it further off. Measured after: 0.5px from the first line's
optical centre, at every call site.

The pre-flight dialog is the one place a sentence survives deliberately. It is
the moment the user consents to spend, so it says what it is spending in words
as well as numbers. Spec §2.4 makes it non-negotiable.

## Tokens and theming

`app/globals.css` is the whole design language.

1. Every colour is declared once in `@theme` with its **light** value — that is
   what makes the Tailwind utility exist and compile to `var(--color-*)`.
2. The dark ramp re-declares the **same token names** in three places:
   `@media (prefers-color-scheme: dark) :root:not([data-theme])`,
   `[data-theme="dark"]`, and an explicit `[data-theme="light"]`.
   **No colour is ever defined only inside a media query.**
3. To add a colour, add it to `@theme` *and* all three blocks.

Light values are ported verbatim from the `supermemory-clone` reference. The
dark ramp is derived here and is deliberately rich rather than a desaturated
inversion: a near-black blue-cast base (`#06080c`) with clearly separated
surface steps (`#0c111a` strip → `#121823` paper → `#16263f` tint), a brighter
accent (`#4d9bff`) so blue actually carries, and saturated status colours.

**The theme toggle is binary and always changes something.** `THEME_BOOT_SCRIPT`
runs before paint and *always* writes a concrete `data-theme`, resolving the OS
preference at boot. The earlier three-state cycle left the attribute unset under
"system", so the first click could produce no visible change and read as broken.
`System` still exists — in the sidebar's Settings section.

## The mock seam

```
lib/data/
  index.ts      export const ds: DataSource   ← the ONLY place that decides
  mock/         MockDataSource, 80–250ms latency, every method implemented
  http.ts       HttpDataSource — the live client, relative paths only
  workspace.ts  loadWorkspace() — one Promise.all for the whole screen
  fixtures/     vault · runs · graph · graph-nodes · profile · sources · search · config · home
```

`mock/` mirrors `fixtures/` one module per domain — `home` · `notes`
(search + note CRUD) · `graph` · `runs` · `sources` · `profile` · `config` —
over a shared `options.ts` that owns `settle()`, the fail scopes and the
synthetic-node count. It was a single 588-line file, past the 500-line rule.

`mock/index.ts` is the seam and nothing else: one `IMPL` object, annotated
`DataSource`, spread from the domain modules. The annotation is what keeps the
contract honest — a missing or misshapen method is a compile error, exactly as
`implements DataSource` was, without a hundred lines of one-line delegation
that can silently drift. `MockDataSource` stays a class because
`new MockDataSource()` is the shape `index.ts` reaches for.

**`mock` mode makes zero `/api/` calls** — verified in a browser: 0 requests on
both `/` and `/styleguide`, in both themes. It is offline dev mode and the
fixture source for the styleguide, not dead code.

**Fixtures are never substituted for real data in `http` mode.** A soft-failed
call degrades to empty *and* names itself in the `partial` banner; it never
falls back to a fixture. The one thing that looked like fixture data —
five connectors and five skills — turned out to be the agent serving
`cortex.yaml`'s template defaults, not the frontend inventing anything.

## Dependencies

Four, all deliberate: `d3-force` (+ its `d3-quadtree`) for the layout, and
`react-markdown` + `remark-gfm` + `rehype-highlight` for the note renderer.
Nothing else — every component in `components/ui/` is hand-built.

## The graph

The centre of the product.

**Simulation: `d3-force`.** `forceManyBody` is a Barnes–Hut approximation, so
repulsion is O(n log n) rather than the O(n²) of the hand-rolled layout it
replaced. At vault scale that is the difference between a smooth drag and a
stuttering one, and velocity-Verlet integration plus alpha decay are not worth
re-deriving.

### The force balance — high repulsion, low link strength, no packing

The previous configuration produced a visible **hexagonal lattice**: hundreds
of leaves in geometric rings around two hubs. That is `forceCollide` winning.
When the collision radius beats charge repulsion, equal-sized nodes settle into
hexagonal close packing — the densest arrangement there is.

Measured headlessly on the live 566-node vault, using ψ₆ (bond-orientational
order over each node's six nearest neighbours):

| Layout | ψ₆ | mean nearest-neighbour |
|---|---|---|
| previous | **0.568** | 24.4px — exactly `2 × (r + 5)`, the collision diameter |
| uniform-random reference | 0.351 | — |
| perfect hexagonal lattice | 0.898 | — |
| **now** | **0.37–0.41** | 49–57px, CV 0.46 |

Every leaf sitting at exactly the collision diameter is the proof that
collision, not charge, was setting the spacing. What changed:

- **Collision is an overlap guard only** — `r + 1`, strength 0.2, one
  iteration. It prevents overlap; it must never decide layout.
- **Charge scales with node count.** Every distance is expressed in units of
  `√(canvas area / node count)`, so a 12-node neighbourhood and a 600-node
  vault settle at the same *relative* density and fit-to-view does the rest.
- **Link distance varies** by relation type, by the busier endpoint's degree,
  and by a per-edge hash — Obsidian's edges are not one length.
- **Link strength is low** and lower still on hub spokes (`0.9 / (degree + 2)`,
  capped): a strong spring on 61 leaves drags them into a tight shell.
- **Orphan gravity stays.** It looked like a candidate for removal once the
  wikilink edges landed — only 11 nodes are truly isolated now. But the default
  view hides `references`, so **342 nodes have no link in the simulation** and
  the orphan path applies to all of them. The ψ₆ rebalance below was measured on
  a graph of the same shape as today's default (591 nodes / 1,286 typed edges vs
  566 / 1,182), so it holds; nothing here was re-tuned against the dense view,
  which only has to stay legible.
- **Gravity was inverted.** The orphan gravity added in the previous round
  (0.14 vs 0.035 for linked nodes) fixed the giant orphan ring by handing
  orphans the centre and pushing the actual graph out to one side — the two
  populations' centroids sat 801px apart. Linked nodes now hold the middle
  (0.05) and orphans get a weak, **per-node jittered** pull (0.02–0.07): a core
  at r≈530 with a cloud at r≈1126, concentric to 18px. The jitter is what makes
  it a cloud instead of a ring — identical nodes with identical gravity settle
  at an identical radius.
- All variation is hashed from node ids, never `Math.random`, so the same vault
  settles the same way twice. Verified.

**Radius must scale with the camera.** Screen radius floored at a *scale* of
0.55× was invisible while a vault fitted at ~0.85×, and became the dominant
visual bug once the rebalance made it fit at ~0.30×: positions shrank by 0.30
and radii by 0.55, so every node was drawn 1.8× too large for its spacing and
the graph read as one overlapping blob with beaded chains off the hubs. It now
tracks the camera 1:1 with a 1.7px floor.

Cost: ~1.5ms/tick at 566 nodes headless, unchanged from before.

**Rendering: `<canvas>`, client-only.** Loaded via `next/dynamic` with
`ssr: false` — load-bearing, not convenience. No geometry is produced on the
server, which makes the `Math.log2` class of hydration bug structurally
impossible rather than merely fixed.

Interaction, all of it Obsidian-shaped:

- **Pan** — drag empty space, or two-finger scroll.
- **Zoom** — wheel or pinch, **anchored at the cursor** (verified to 0.00px
  drift), damped at the limits, clamped to 0.12×–6×.
- **Fit** — double-click empty space or the `⊡` control. The camera also fits
  itself: see "The camera follows the layout" below.
- **Drag a node** — it pins while held, the simulation reheats and reacts live,
  and it re-settles on release.
- **Hover** — the node and its immediate neighbours stay lit; everything else
  drops to 13% opacity.
- **Labels** appear past 0.75× (heaviest nodes only) and fully past 1.35×;
  below that only hover and selection are labelled.
- **Relation filter** — the legend doubles as a filter, and filtering removes
  links from the live simulation, so the layout re-settles. It filters by
  relation **class**, not by relation name: the old name list covered seven of
  the vault's 69 types, so the other ~55 belonged to no swatch and could be
  neither hidden nor isolated.
- `prefers-reduced-motion` settles the layout in one synchronous pass and never
  animates.

### The camera follows the layout

**View B drew 2 of a 13-node neighbourhood.** The nodes were all there: the
camera was not. Measured on the live vault with `__cortexGraph`, a 20-node
neighbourhood had **14 of 20 nodes outside the canvas for the first ~3 seconds**
after the node was selected, and that is with a generous 120px margin — the
strict count was worse, and the six that were on screen were drawn at scale 1,
enormous and overlapping. A neighbourhood that has two neighbours and one that
is showing two of thirteen are pixel-identical, which is this build's recurring
failure shape.

The cause was **when** it framed, not **whether**. Framing happened once, on
d3's `end` event, with a 2,600ms timer as a safety net; until one of those
fired the camera sat wherever it was — identity on a fresh mount, or the
previous node's frame when you clicked a neighbour — while the layout expanded
outward from d3's phyllotaxis seed at the world origin.

It now frames **on every tick** while `autoFit` is armed, plus once
synchronously before the first paint (`forceSimulation` seeds `x`/`y` in its
constructor, so there is always a real layout to frame). `boundsOf` is one
O(n) pass against a tick that is already O(n log n), so it costs nothing
measurable.

- **Armed** by any simulation rebuild — a new node set, a relation-class
  filter, the `mentions` toggle, expanding a node from the neighbour list. All
  four were the same staleness and all four are fixed by the same line.
- **Disarmed** by the user taking the camera: pan, wheel/pinch zoom, the
  `+`/`−` buttons, or dragging a node. Auto-fit would otherwise chase the
  dragged node and fight the pan one frame behind.
- **Re-armed** by an explicit fit (`⊡` or double-click) — that gesture *is*
  "follow the graph again". On a settled graph nothing ticks, so it is a
  one-shot.

Measured after, strict margin, no 120px slack: **20/20 nodes on screen at
120ms** and stable through settle, for all of first-click, neighbour-expand and
legend-toggle.

**A clipped neighbourhood says so.** `GraphContext` builds View B's
neighbourhood from the loaded graph, so a neighbour whose node was cut by
`getGraph`'s node limit arrives as an edge with nothing on the other end and
was silently dropped. It now counts them and renders
`neighbourhood-clipped-notice` above the canvas, in words, alongside the
whole-graph `graph-truncated-notice`. On the live vault the count is zero —
591 nodes against a limit of 2,000, `truncated: false`, no dangling edges — but
"currently zero" is not the same as "cannot happen".

### Typed edges are the default; wikilinks are a toggle

The pipeline used to emit only the typed edges from `## Edges` sections, while
Obsidian draws one for every `[[wikilink]]`. It now emits both, and the counts
are decisive:

| | edges | notes it connects |
|---|---|---|
| typed (`causes`, `proves`, `derived-from`, …) | **1,286** | 238 |
| `references` (untyped wikilinks) | **1,694** | +342 |

The owner saw both extremes and was right about both: typed-only "looked pretty and
clean but the number of connections was not enough"; everything drawn and "the
structure is fucked and it's just noise to look at". The answer is the
hierarchy, not the physics.

**A typed edge is an assertion. A wikilink is a mention.** The default view
shows what he actually stated — 1,286 coloured edges — and `mentions` is off in
`DEFAULT_HIDDEN_CLASSES`. Turned on, references draw at **0.5px and 0.16
opacity**, so they read as texture behind structure rather than as competing
structure; the busiest node pulls 264 of them.

The 342 notes that connect *only* through mentions look unconnected in the
default view. That is now true rather than a bug, but it looks exactly like the
bug it used to be, so the legend carries one line: *"342 more notes connect only
through mentions — show them."* One sentence, factual, and it turns a
suspicious-looking gap into a button.

`derived-from` also came out of the generic structure bucket and onto
`--color-blue-light`: 200 edges, provenance for the whole synthesis layer, and
"this was derived from that" is not "this is part of that". No new hue was
invented — the token was already in the ramp.

### Frame rate

Measured in headless Chromium, 1440×900, retina backing store, on a canvas of
~806×830 CSS px:

| Graph | Idle | Node drag | Pan |
|---|---|---|---|
| 23 nodes / 28 edges | 60 | 60 | 60 |
| 300 / 582 | 60 | 60 | 60 |
| **600 / 2,921** (≈ the real vault, both edge kinds) | **60** | **60** | **60** |
| 1,200 / 2,382 | 47 | 46 | 48 |

Reproduce with `?nodes=600` — the mock pads the graph with deterministic
synthetic nodes. The padding emits **two typed and three `references` edges per
node**, reproducing the real 1,286:1,694 ratio, so the harness measures the
density that ships rather than one half as dense. Re-measured at ~2.9k edges
after the wikilink edges landed: still 60fps idle and panning.

Three things got it there, in order of impact:

1. **Repaint only when something changed.** Profiling showed ~95% of frame time
   in the browser rasteriser, not in JS — so the fix was to stop asking it to
   rasterise. A settled graph now repaints not at all.
2. **The animated conflict rings live on a separate overlay canvas**, so the
   one thing that changes on a settled graph does not dirty the expensive layer.
3. **Backing-store resolution scales with geometry.** Above 120 nodes or 200
   edges the canvas drops to 1× — a dense graph is read as shape, not as crisp
   edges — while small View B neighbourhoods stay retina-crisp.

A batching pass that bucketed draw calls by style was tried and **made things
worse** (60 → 25fps at 600 nodes): the per-frame Map keys and array allocation
cost more than the canvas state changes they saved. The current buffers are
allocated once and reused; nothing in the render path allocates.

## The note renderer

`components/detail/Markdown.tsx` — **react-markdown + remark-gfm +
rehype-highlight**, plus a local `remarkVault` plugin.

The renderer this replaced was hand-rolled and understood four constructs, so a
real vault came through half-broken: GFM tables as a wall of `| # | Block |`,
blockquotes as `>`, `---` as literal dashes, `**Arc:**` with its asterisks. A
vault is arbitrary markdown; the renderer has to be a real CommonMark parser.

- **Sanitised by construction.** `rehype-raw` is *not* installed, so HTML in a
  note is escaped and shown, never executed, and nothing in this path uses
  `dangerouslySetInnerHTML`. There is no allowlist to keep correct because
  there is no HTML pass at all. `<script>` in a note renders as text.
- **rehype-highlight** over shiki: no WASM grammar engine, no async init, and
  the `.hljs-*` tokens are mapped onto the design tokens in `globals.css` so
  code follows the theme instead of dragging in a third palette.
- **`remarkVault`** does two vault-specific jobs on the syntax tree — never on
  the source string, so `[[…]]` inside a code fence stays literal:
  1. turns `[[Wikilinks]]` (with `|alias` and `#heading`) into link nodes on a
     `wiki:` URL, which `urlTransform` has to allow explicitly — react-markdown
     blanks unknown protocols, and that silently killed every wikilink until it
     did;
  2. splits a paragraph of stacked `relation::` lines into one row each.
     CommonMark joins them, which is right for hard-wrapped prose and wrong for
     an `## Edges` block.
- **Wikilinks resolve through `lib/note-index.ts`**, a title→path map paged from
  `listNotes()` in the background (1,292 notes = 13 requests, none on the
  critical path). The graph was tried first and is only a fallback: its node
  ids are titles, but it only holds notes that have an edge, so it resolved 2
  of 31 links in one real note and called the rest dangling. Genuinely
  unresolvable links render dotted and grey rather than as dead buttons.
- **Frontmatter** is stripped from the body and rendered as a small structured
  header from the parsed `Note.frontmatter` the API already returns.
- Tables get their own `overflow-x` container, so a wide table never widens the
  panel.

## Insights are insights; contradictions are contradictions

The INSIGHTS module listed five **contradiction pairs** and zero insights, so
the only label on screen described the one thing it was not showing.

An **Insight** here is a Layer-2 synthesised node: derived from a subgraph,
carrying `derived-from:`, living in the vault's insights folder, and fed back
into the graph with its own edges. A **contradiction** is an open tension from
the Contradiction Register (spec §6) — two nodes that disagree, waiting on a
human. Different objects, different verbs, now different modules.

- `lib/insights.ts` selects insight nodes by folder **and** by a `derived-from`
  edge, folder first. Both signals are needed and the order matters: the live
  vault has **46 notes in `Insights/`** and, at the time this was written, **one
  `derived-from` edge in the whole graph**. Detecting on the edge alone reports
  zero insights, which is the same failure in the opposite direction.
- Rows are ranked by degree, because an insight's value is the edges it carries.
  A synthesis wired into two neighbours gets a grey bullet; one wired into
  twelve gets blue.
- `ContradictionsModule` shows the first three pairs and hands the rest to the
  panel. That bound is load-bearing: rendering all five at full height made the
  module 352px of an 832px rail and squeezed INSIGHTS to a **26px slit holding
  2,397px of content**.

## The `+` on Tasks — and the one thing it cannot do

Connectors, Skills and now Tasks carry the same `+`, in the same place in the
module header, opening the same side panel. One gesture, three modules.

What makes this one different is an asymmetry the UI has to say out loud:

| | CORTEX can | so the UI |
|---|---|---|
| **dashboard-button task** | create it outright — it owns that trigger | creates it, and it is pressable immediately |
| **Routine** | **not create it.** Anthropic's scheduler runs on the user's own Claude account | returns a sentence to register there |

That is why `NewTaskResult.routinePrompt` is a returned *string* and not a side
effect, and why the tail of this flow is structurally the Skills `+`: it ends
in a copyable block with a "paste this into Claude" affordance.

### Two kinds, chosen before anything is typed

The form used to be one, with **"How often (optional)"** always on screen and a
toggle under it. On a form that creates a button, a cadence field is a lie by
placement: it implies CORTEX will run the thing on that cadence, and CORTEX
cannot schedule anything at all. The field did nothing unless the toggle was
on, and even then it only changed the wording of a sentence the user has to
paste into Claude themselves.

So `PanelTarget` now carries `mode`, and step one is the choice
(`new-task-kind`), using the two glyphs `TasksModule` already spends on these
triggers:

| | `▶` a button on your dashboard | `◷` something that runs on a schedule |
|---|---|---|
| what CORTEX does | creates it | writes a prompt |
| the cadence field | **never shown** | shown, required, labelled `When` |
| the panel title | New button | New scheduled task |
| terminal state | the task, pressable now | the prompt block + Copy |

`mode` lives on the target rather than in component state so the panel header
can name the branch — "a button CORTEX can press" is the wrong subtitle for a
flow that ends in a prompt CORTEX cannot register.

The scheduled branch's terminal state and the Skills `+` terminal state are
the **same component** (`components/panel/PromptBlock.tsx`): heading, `<pre>`,
Copy button. They are two instances of one claim — *CORTEX prepares a prompt;
your own Claude runs it* — and two hand-rolled copies would drift on exactly
the wording that carries it.

- **`nextRun` is never rendered for a task CORTEX made.** The agent refuses to
  invent one and the UI must not fill the gap — a task that looks scheduled
  when nothing scheduled it is the "correct-looking output over incomplete
  input" failure with a calendar on it. The panel shows the trigger and the
  skill; the budget is free text the user typed, shown as that or not at all.
- **The warning lives outside the prompt block.** `routinePrompt` is rendered
  **verbatim** — nothing in this app composes it. The agent now puts the
  cadence *in* the sentence (verified live 2026-08-11): `budget: "weekday
  morning"` → `Every weekday morning, run my … via CORTEX`, and a blank budget
  → the bare `Run my … via CORTEX`. The `When` field is therefore required on
  that branch, and `carriesCadence()` re-reads the returned sentence: one still
  opening on "run my" gets the warning that it carries no *when*, rather than a
  cadence spliced in here. `MockDataSource` composes the same table, because a
  mock that always returned the bare form taught the offline build a contract
  the live agent does not honour.
- **The scheduled branch also creates the button**, because `POST /api/tasks`
  is one route: `asRoutine` adds the sentence, it does not replace the task.
  The panel says so in one line under the prompt rather than hiding it.
- **The picker offers only invocable skills**, strictly `invocable === true`,
  from `listSkills()` — never `cortex.yaml`'s `skills.enabled`. That wish list
  produced four phantom skills one round ago, and binding a task to one is the
  same trap a layer up except the failure now has a button of its own. An
  unknown `invocable` counts as no: the cost is an honest empty state, and the
  cost of the other choice is a task that fails the first time it is pressed.
  Live, that is 1 of 131.
- **Nothing invocable is a real state, not an empty dropdown.** It says so and
  offers the Skills `+`, which is the thing that fixes it.
- **Running a task goes through the same pre-flight gate the backlog does** —
  estimate → explicit confirm → run (spec §2.4). `components/ui/Preflight.tsx`
  is now shared by both, rather than two copies that would drift about what the
  numbers mean.
- **Tasks the user created are listed above the run history.** A task that has
  never run has no run to appear as, so without this the `+` produces a toast
  and no visible change.

### Which tasks may be deleted

`deleteTask` applies only to user-created tasks; built-ins are template. **And
`TaskDef` does not say which is which** — see the report. `lib/task-origin.ts`
resolves it from three signals, in order, and **unknown never gets a delete
button**: an agent-declared `origin`/`source`, then the agent's `user:` id
namespace (`process-backlog` template · `skill:meeting-to-actions` derived ·
`user:draft-this-weeks-post` created here), then first-hand knowledge that this
session created it.

The prefix match is the compromise, and it is a convention standing in for a
field. It is defensible only because the **agent mints these ids** — it is
agent-internal naming, not vault content, unlike the folder-name matching
`lib/insights.ts` warns about — and because it fails safe: if the convention
changes, delete stops being offered rather than starting to be offered on a
template. The agent refuses `DELETE` on a built-in anyway (`invalid_input`),
so the guard is doubled.

## Uploads

`DataSource.uploadFiles(files: UploadFile[])` carries **real bytes** —
`multipart/form-data`, field `files`, per `06-http-api.md`. The previous
signature carried `{ name, bytes }`, so the drop zone registered filenames and
ingested nothing.

`lib/use-upload.ts` sends **one request per file, two at a time**. The contract
takes an array and the agent handles batches, but a batched request can only
report progress once, at the end; per-file requests give real per-file state
and isolate a refusal to the file it belongs to.

The agent returns `200` even when every file is refused, so `rejected[]` is
always read and always shown, with the server's reason text verbatim —
clamped to three lines with the full text on hover, because a
"saved but not registered" reason can carry a whole traceback. That case is
**amber, not red**: the bytes are in the vault and the next rebuild picks them
up; colouring it as a failure sends the user hunting for a file that is
already there.

## Skills and connectors are discovered, never read from config

Two bugs, stacked, both of them "we looked in the wrong place".

`config.skills.enabled` is a **wish list** — the template names five skills and
the repo contains one, so rendering it produced four phantom skills whose
buttons would have failed on click. And `listSources()` returns *ingest source
templates*, so reading it for connectors drew five phantom connectors.

Both were fixed by reading only `listSkills()`, `getSkillsReport()` and
`listConnectors()` — and then those reported **1 skill and 0 connectors** on a
machine with 12 MCP servers in `~/.claude.json`, 2 more in Claude Desktop,
3 skills in the vault and dozens under `~/.claude/skills/`. Discovery now spans
repo · vault · user · Claude Desktop · config, and the live numbers are:

| | found | usable by CORTEX |
|---|---|---|
| Skills | **131** | **1** |
| Connectors | **14** | **0** |

Those two columns are the whole design problem, and neither is rounded.

- **Origin is a mono tag on every row** — `cortex` · `vault` · `yours` ·
  `desktop` · `config`.
- **Reachability is a labelled group, not a colour.** Everything CORTEX can
  actually run comes first; the rest sit under `IN YOUR CLAUDE · n` with one
  sentence: *"Configured in your own Claude, not in CORTEX. They work in a
  session there; nothing CORTEX runs can call them."* A greyed row would read
  as "disabled" rather than "visible but not wired", and this is a correctness
  signal, so it spends words.
- **Three states, never two.** `source` and `invocable` are read through
  runtime guards (`lib/discovery.ts`) even though the types declare them
  required: an agent built before discovery landed omits them, and an omitted
  origin must render as *nothing*. Defaulting it to `repo` would be a lie about
  where someone's skill lives.
- A connector never contacted still reports `unconfigured`, not `ok`.

## Nothing scrolls except a panel

Three scrollbars were visible at once in the node detail view, with a screen of
dead white below the content.

The third one was the **page**. `overflow: hidden` on the 100vh shell did not
stop it — `window.scrollTo(0, 800)` still moved the whole app — because a
**statically positioned** scroll container lets its descendants' layout overflow
reach the initial containing block. A tall note inside the side panel took
`documentElement.scrollHeight` to **4,826** against a 900px viewport. Adding
`position: relative` to that one container took it back to **900**.

So the fix is on the scroll regions, not on `body`: `.scroll-region` in
`globals.css` carries `position: relative` + `overflow-y: auto` +
`overscroll-behavior: contain`, and every scrolling region uses it.
`body { overflow: hidden }` was tried and rejected — it is a blunt instrument
that also breaks `/styleguide` and `/sign-in`, which are documents and are
supposed to scroll.

The rest of the rule set, verified at 700 / 900 / 1200px in both themes and both
views: **zero** nested scroll containers, and the page never scrolls in either
view.

- **No reserved height.** Rail rows are `minmax(0, auto)` — content-sized and
  able to shrink and scroll themselves — with the slack going to one
  `minmax(150px, 1fr)` row. The floor matters: at 700px the other three modules
  squeezed INSIGHTS to 24px, which is the "no dead space" rule failing in the
  opposite direction.
- **View B's connected-node list is flex, not a grid row.** A `1fr` row gave it
  half the column whether it held two rows or forty; it is now its own height,
  capped at 45% so a hub node cannot swallow the map. It is not rendered at all
  when the focused node has no neighbours.

## The title-as-path trap

`GraphNode.id`, `GraphEdge.source`/`target`, `Contradiction.nodeA`/`nodeB`,
`HomeSummary.connected[].nodes` and every `[[wikilink]]` are **titles** —
`nodeIds: basename`, because that is how Obsidian resolves links. `readNote`
takes a path. Handing it a title 404s a note that plainly exists, and it has
now cost two rounds, so it is closed structurally rather than one call site at
a time.

`lib/node-path.ts` is the single crossing: note index first, graph second,
paths passed through. A caller that cannot resolve renders text, never a button
that is going to fail. Found and fixed in this sweep:

| Where | Was |
|---|---|
| `ContradictionPanel` | passed `nodeA`/`nodeB` to `readNote` — the reported NOT FOUND. Uses `pathA`/`pathB` now, with the resolver as fallback. |
| `Workspace` flags | `stale` and `fresh` were filled with **paths** while the renderer looks up `n.id`, so the amber and blue rings matched nothing on a live vault. |
| Insights "newly connected" | opened `connected[].nodes[0]`, an id, as a path. |
| `HttpDataSource.listContradictions` | fills `pathA`/`pathB` when an older agent omits them — only from `evidence.sourceFile`, and only when its basename matches the title, because `strategy: "provenance"` points at the *source document*, not the note. |

Clean, and confirmed clean: search hits, the stale list, run `wrote[]`,
neighbour rows and wikilinks all already carried paths.

## Notable implementation choices

- **Ingest is the drop target.** Dragging files onto the module is the primary
  ingest gesture; it shows a dashed-blue drop state and says the conversion is
  free, because upload is trigger-free and spends no Claude.
- **`/new-skill` produces a prompt, not code** (spec §8.3). The `+` on Skills
  ends in a copyable block the user pastes into their own Claude session. That
  is trigger 2, and it is why skill creation costs the client no infrastructure.
- **Canvas cannot parse CSS variables.** Colours are read out of the document
  with `getComputedStyle` into a palette object on every theme change, and the
  label font family is resolved the same way — assigning
  `12px var(--font-dm-sans)` to `ctx.font` is invalid and silently leaves the
  default 10px sans-serif.
- **The markdown renderer is `react-markdown`** — see "The note renderer" below.
- `useAsync` derives `loading` from whether the settled result matches the
  current request key, so no state is set synchronously inside an effect.
- `usePolling(loader, ms, active, stopWhen)` drives live run progress and stops
  itself the moment the run reaches a terminal status.

`data-testid`s for integration tests: `graph-canvas`, `markdown`, `frontmatter`,
`contradiction-list`, `contradiction-panel-list`, `graph-truncated-notice`,
`neighbourhood-clipped-notice`, `user-tasks`, `routine-prompt`,
`routine-not-registered`, `new-task-kind`, `new-task-no-skill`,
`new-skill-prompt`,
`skills-not-invocable`, `connectors-unreachable`,
`wikilink`, `wikilink-dangling`, `upload-list`, `ingest-file-input`,
`skills-missing`, `module-*`, `health-chip`,
`health-popover`, `session-stats`, `session-popover`, `search-input`,
`search-results`, `sidebar`, `sidebar-toggle`, `theme-toggle`,
`process-backlog-button`, `preflight-confirm`, `dialog`, `toast`,
`neighbour-list`, `insight-lines`, `task-runs`, `connector-list`, `skill-list`,
`stage-bars`, `output-list`, `empty-state`, `error-state`.

## Product rules this app enforces

- **No chat box.** Spec §10 — if it opened on one, the client would use real
  Claude instead.
- **No money figures**, anywhere, including fixtures. There is no currency
  formatter in `lib/format.ts` and one must not be added.
- **Nothing runs without a click.** Backlog always goes depth → pre-flight
  estimate → explicit confirm → run.
- **Trickle stays visible** (§2.4) — a `∴n` count at rest, the full unit list
  one click away, never behind a setting.
- **Re-auth is a feature, not an incident** (§11) — amber dot plus a day count
  at ≤14 days, one-click device-code dialog, no terminal.
