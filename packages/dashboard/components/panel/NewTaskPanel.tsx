"use client";

import { useMemo, useState } from "react";
import type { NewTaskResult, SkillInfo } from "cortexos-types";
import { ds } from "@/lib/data";
import { canCortexRun } from "@/lib/discovery";
import { rememberCreatedTask } from "@/lib/task-origin";
import { Button, Dot, DotBullet, Input, Select, useToast } from "@/components/ui";
import { PromptBlock } from "./PromptBlock";

/**
 * The two things the `+` on Tasks can make. They are different objects and the
 * user picks before filling anything in, because the form for one is a lie on
 * the other:
 *
 * - `button` — CORTEX creates it outright. That trigger is its own.
 * - `routine` — CORTEX **cannot** create it. Anthropic's scheduler runs on the
 *   user's Claude account, so the flow ends in a sentence to paste there.
 */
export type NewTaskMode = "button" | "routine" | "job";

/**
 * The line the `job` branch hands the user to paste into Claude.
 *
 * WHY THIS BRANCH EXISTS AT ALL. The `+` could only make a task by binding one
 * to an already-installed skill, which asks a person to answer two questions
 * they have no way to answer: which skill, and — the one they asked about out
 * loud — whether the thing should run on the dashboard or in chat.
 *
 * Neither is theirs to decide. The second is *derived*: a job declares what it
 * needs, and CORTEX works out from that where it can run. The first is a
 * developer's question wearing a dropdown.
 *
 * So this branch asks for the only two things the user actually knows — what to
 * call it, and what should happen — and routes the authoring to Claude, which
 * is where authoring already lives: chat writes `00 Maps/Jobs.md`, the
 * dashboard reads it. That is the same split the whole jobs feature runs on,
 * made visible at the point someone tries to create one.
 */
export function jobRequestPrompt(name: string, what: string): string {
  return [
    `Add a job called "${name.trim()}" to my \`00 Maps/Jobs.md\`.`,
    "",
    "What it should do:",
    what.trim(),
    "",
    "Follow the file's existing format: a quoted trigger phrase as the heading,",
    "the instructions in prose, and the typed lines it uses —",
    "`writes::` for the file it produces, `needs::` for what it depends on",
    "(calendar, gmail, bash, a connector), `uses::` for a skill.",
    "",
    "Get `needs::` right: CORTEX reads it to work out whether the job can run on",
    "my dashboard or has to run here with you. Then it shows up in Tasks by itself.",
  ].join("\n");
}

/**
 * Skills the picker may offer: **installed and invocable, nothing else.**
 *
 * Strictly `=== true`, not `!== false`. `config.skills.enabled` is a wish list
 * — rendering it once produced four phantom skills whose buttons failed on
 * click — and binding a task to one is the same trap a layer up, except the
 * failure now has a button of its own. An unknown `invocable` is treated as
 * "no": the cost is an honest empty state, and the cost of the other choice is
 * a task that 500s the first time it is pressed.
 */
export function invocableSkills(skills: SkillInfo[]): SkillInfo[] {
  return skills
    .filter((s) => canCortexRun(s) === true)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The agent composes the cadence into the sentence itself
 * (`packages/agent/docs/06-http-api.md` — "The exact `routinePrompt` wording"):
 * a blank `budget` returns the bare `Run my <label> via CORTEX`, and anything
 * else prefixes a clause — `Every weekday morning, run my <label> via CORTEX`.
 *
 * So a prompt still opening on "run my" is one Claude has no *when* to
 * schedule against. We say that out loud rather than editing the agent's
 * sentence to add a cadence it did not choose.
 */
export function carriesCadence(prompt: string): boolean {
  return !/^\s*run my\b/i.test(prompt);
}

/**
 * The task factory — the `+` on the TASKS module.
 *
 * Structurally two flows behind one gesture, and the split is the point.
 * The button path ends in a real, pressable task. The scheduled path ends
 * exactly where the Skills `+` ends: a copyable prompt block, because the
 * underlying truth is the same in both — **CORTEX prepares a prompt; the user
 * registers it in their own Claude.**
 *
 * Nothing here ever renders `nextRun`. A task that looks scheduled when
 * nothing scheduled it is the "correct-looking output over incomplete input"
 * failure with a calendar on it.
 */
export function NewTaskPanel({
  mode,
  skills,
  onChooseMode,
  onCreated,
  onOpenSkills,
}: {
  /** Undefined = the user has not chosen a kind yet. */
  mode?: NewTaskMode;
  skills: SkillInfo[];
  /** Re-targets the panel, so the header can title the branch it is on. */
  onChooseMode: (mode: NewTaskMode | undefined) => void;
  /** Reload the workspace so the new task is real on screen, not just here. */
  onCreated: () => void;
  /** Nothing invocable — send them to the place that fixes it. */
  onOpenSkills: () => void;
}) {
  const options = useMemo(() => invocableSkills(skills), [skills]);

  /*
   * The job branch comes FIRST, before the invocable-skill check.
   *
   * It binds no skill, so it does not need one — and on a fresh install, where
   * nothing is invocable yet, it is the only way forward. Checking skills first
   * turned the `+` into a dead end at exactly the moment a new user pressed it.
   */
  if (mode === "job") return <JobRequest onBack={() => onChooseMode(undefined)} onDone={onCreated} />;

  if (!mode) return <KindChooser onChoose={onChooseMode} hasSkill={options.length > 0} />;

  /*
   * Checked after the chooser now: with no invocable skill the other two kinds
   * cannot be made, but the job branch above still can.
   */
  if (options.length === 0) return <NothingInvocable onOpenSkills={onOpenSkills} />;

  return (
    <TaskForm
      mode={mode}
      options={options}
      onBack={() => onChooseMode(undefined)}
      onCreated={onCreated}
    />
  );
}

/**
 * An empty dropdown is a dead end that looks like a bug. On the live machine
 * this is the *likely* state — 131 skills discovered, 1 invocable — so it gets
 * words and a way out rather than a disabled control.
 */
function NothingInvocable({ onOpenSkills }: { onOpenSkills: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <p
        data-testid="new-task-no-skill"
        className="t-body border-l-2 border-warn bg-warn-tint px-3.5 py-3 text-text"
      >
        There is no skill CORTEX can run yet, so there is nothing to bind a task to. Skills found in
        your own Claude do not count — CORTEX cannot invoke those.
      </p>
      <p className="t-body-sm text-text-muted">
        Build one with the <span className="t-mono text-text">+</span> on Skills. It writes itself in
        your own Claude session, then it can carry a task.
      </p>
      <Button variant="primary" block onClick={onOpenSkills}>
        Go to new skill
      </Button>
    </div>
  );
}

/**
 * Step one, and the reason the cadence field stopped being a lie: you say
 * which of the two you are making before you fill in anything, so a cadence is
 * only ever asked for on the one that puts it in a sentence.
 *
 * The two glyphs are the ones `TasksModule` already uses for these triggers —
 * `▶` pressed it, `◷` a scheduled Routine — so the choice is carried by the
 * same marks the run list is carrying.
 */
function KindChooser({
  onChoose,
  hasSkill,
}: {
  onChoose: (mode: NewTaskMode) => void;
  /** No invocable skill means the first two kinds cannot be built yet. */
  hasSkill: boolean;
}) {
  return (
    <div className="flex flex-col gap-2.5" data-testid="new-task-kind">
      {/*
        FIRST, because it is the one that needs nothing to already exist and the
        one that answers the question people actually arrive with. The other two
        require an installed skill and a decision about triggers; this one
        requires only that you know what you want to happen.
      */}
      <KindCard
        glyph="❯"
        title="Describe what you want it to do"
        detail="You say it in words, Claude writes it into your jobs file, and it appears here. CORTEX works out on its own whether it can run on the dashboard."
        onClick={() => onChoose("job")}
      />
      <KindCard
        glyph="▶"
        title="A button on your dashboard"
        detail={
          hasSkill
            ? "CORTEX makes this one. It appears in Tasks and runs when you press it."
            : "Needs a skill CORTEX can run, and there is none yet."
        }
        onClick={() => onChoose("button")}
      />
      <KindCard
        glyph="◷"
        title="Something that runs on a schedule"
        detail={
          hasSkill
            ? "CORTEX writes the prompt; you register it in your own Claude, which owns the schedule."
            : "Needs a skill CORTEX can run, and there is none yet."
        }
        onClick={() => onChoose("routine")}
      />
    </div>
  );
}

/**
 * The job branch: two questions, then the line to paste.
 *
 * No skill picker, no trigger choice, no cadence — none of those are things the
 * person pressing `+` can answer, and two of the three are derived anyway. What
 * comes back is a task in the list like any other, with CORTEX's own routing
 * decision already made from the `needs::` line Claude wrote.
 */
function JobRequest({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const [name, setName] = useState("");
  const [what, setWhat] = useState("");
  const ready = name.trim().length > 0 && what.trim().length > 0;

  return (
    <div className="flex flex-col gap-4">
      <Input
        label="What should it be called?"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="weekly recap"
        hint="This becomes the phrase you can type at Claude to run it."
      />
      <Input
        label="What should happen?"
        value={what}
        onChange={(e) => setWhat(e.target.value)}
        placeholder="Go through what I shipped this week and write me a one-page recap"
      />

      {ready ? (
        <PromptBlock
          prompt={jobRequestPrompt(name, what)}
          heading="Paste into Claude"
          testId="job-request-prompt"
          copiedMessage="Copied — paste it into Claude"
        />
      ) : (
        <p className="t-body-sm text-text-muted">
          Fill both in and the line to paste appears here.
        </p>
      )}

      <div className="flex items-start gap-2.5 border border-border bg-paper px-3.5 py-3">
        <DotBullet tone="blue" />
        <p className="t-body-sm text-text-muted">
          Claude writes it into <span className="t-mono text-text">00 Maps/Jobs.md</span>, which is
          the list this dashboard reads. It shows up in Tasks on its own — you do not come back here.
        </p>
      </div>

      <div className="flex justify-between gap-2">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button variant="primary" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  );
}

function KindCard({
  glyph,
  title,
  detail,
  onClick,
}: {
  glyph: string;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 border border-border bg-paper px-3.5 py-3 text-left transition-colors hover:border-border-strong hover:bg-blue-tint"
    >
      <span aria-hidden className="t-mono-lg w-4 shrink-0 text-center text-text-dim">
        {glyph}
      </span>
      <span className="min-w-0">
        <span className="t-body block text-text">{title}</span>
        <span className="t-body-sm block text-text-muted">{detail}</span>
      </span>
    </button>
  );
}

/**
 * One form, branched on `mode`. The fields a task needs are the same either
 * way; **the cadence field exists only on the scheduled branch**, because on
 * the button branch there is nothing it could ever affect.
 */
function TaskForm({
  mode,
  options,
  onBack,
  onCreated,
}: {
  mode: NewTaskMode;
  options: SkillInfo[];
  onBack: () => void;
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [skill, setSkill] = useState("");
  const [cadence, setCadence] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<NewTaskResult | null>(null);

  const chosen = skill || (options[0]?.name ?? "");
  const routine = mode === "routine";
  const valid =
    label.trim().length > 0 && chosen.length > 0 && (!routine || cadence.trim().length > 0);

  if (result) {
    return routine ? (
      <RoutineReady result={result} onDone={onCreated} />
    ) : (
      <ButtonReady result={result} onDone={onCreated} />
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid || busy) return;
        setBusy(true);
        setError(null);
        try {
          const created = await ds.createTask({
            label: label.trim(),
            skill: chosen,
            ...(description.trim() ? { description: description.trim() } : {}),
            // Both only ever go with the scheduled branch: `budget` is what the
            // agent turns into the cadence clause, and it has no other job.
            ...(routine ? { asRoutine: true, budget: cadence.trim() } : {}),
          });
          // First-hand knowledge that this one is the user's, so delete can be
          // offered on it even when `TaskDef` carries no origin field.
          rememberCreatedTask(created.task.id);
          setResult(created);
          toast({
            tone: "ok",
            message: routine ? "Prompt ready" : `${created.task.label} created`,
          });
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Could not create that task.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <Input
        label="Name"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Draft this week's post"
      />
      <Input
        label="What does it do?"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Turn the week's decisions into a draft"
      />
      <Select
        label="Skill"
        value={chosen}
        onChange={(e) => setSkill(e.target.value)}
        options={options.map((s) => ({ value: s.name, label: s.name }))}
        hint={
          options.length === 1
            ? "The one skill CORTEX can currently invoke."
            : `${options.length} skills CORTEX can invoke.`
        }
      />

      {routine ? (
        <Input
          label="When"
          value={cadence}
          onChange={(e) => setCadence(e.target.value)}
          placeholder="weekday morning"
          hint="This becomes the first words of the sentence you paste — “Every weekday morning, …”. Claude keeps the schedule; CORTEX keeps none."
        />
      ) : null}

      <div className="flex items-center gap-2.5 border border-border bg-paper px-3.5 py-3">
        <Dot tone="ok" size={7} />
        <p className="t-body-sm text-text-muted">
          {routine
            ? "Writing the prompt costs no Claude. Only the runs it triggers do."
            : "Creating a task costs no Claude. Only pressing it does."}
        </p>
      </div>

      {error ? (
        <p className="t-body border-l-2 border-danger bg-danger-tint px-3.5 py-3 text-text">
          {error}
        </p>
      ) : null}

      <div className="flex justify-between gap-2">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button type="submit" variant="primary" loading={busy} disabled={!valid}>
          {routine ? "Write the prompt" : "Create task"}
        </Button>
      </div>
    </form>
  );
}

/** The button branch's terminal state: the task is real and pressable now. */
function ButtonReady({ result, onDone }: { result: NewTaskResult; onDone: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2.5 border border-border bg-paper px-3.5 py-3">
        <DotBullet tone="blue" />
        <p className="t-body-sm text-text-muted">
          <span className="text-text">{result.task.label}</span> is on your dashboard. Pressing it
          runs {result.task.skill ?? "its skill"}.
        </p>
      </div>
      <Button variant="primary" block onClick={onDone}>
        Done
      </Button>
    </div>
  );
}

/**
 * The scheduled branch's terminal state — the same shape as the Skills `+`:
 * warning, prompt block, Copy.
 *
 * The warning is **outside** the block, because `routinePrompt` is rendered
 * verbatim and the admission that nothing was scheduled is not part of the
 * sentence the user pastes.
 */
function RoutineReady({ result, onDone }: { result: NewTaskResult; onDone: () => void }) {
  const prompt = result.routinePrompt;

  /*
   * `asRoutine` was sent, so the agent should have returned one. If it did
   * not, the honest end of this flow is that there is no prompt — never a
   * sentence composed here to fill the hole.
   */
  if (!prompt) {
    return (
      <div className="flex flex-col gap-4">
        <p
          data-testid="routine-not-registered"
          className="t-body border-l-2 border-warn bg-warn-tint px-3.5 py-3 text-text"
        >
          CORTEX did not get a prompt back for this one, and it will not write you one — the
          sentence has to be the agent&rsquo;s. Nothing has been scheduled.
        </p>
        <Button variant="primary" block onClick={onDone}>
          Done
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p
        data-testid="routine-not-registered"
        className="t-body border-l-2 border-warn bg-warn-tint px-3.5 py-3 text-text"
      >
        Nothing has been scheduled. Claude&rsquo;s scheduler runs on your account, not on
        CORTEX&rsquo;s, so registering this is yours to do
        {carriesCadence(prompt)
          ? " — the cadence is already in the sentence."
          : ". The sentence below carries no “when”, so say one while you are there."}
      </p>

      <PromptBlock
        prompt={prompt}
        heading="Paste this into Claude as a Routine"
        testId="routine-prompt"
      />

      <div className="flex items-start gap-2.5 border border-border bg-paper px-3.5 py-3">
        <DotBullet tone="blue" />
        <p className="t-body-sm text-text-muted">
          <span className="text-text">{result.task.label}</span> is also on your dashboard, so you
          can press it yourself without waiting for the schedule.
        </p>
      </div>

      <Button variant="ghost" block onClick={onDone}>
        Done
      </Button>
    </div>
  );
}
