"use client";

import { useMemo, useState } from "react";
import type { SkillInfo } from "cortexos-types";
import { canCortexRun, sourceSentence } from "@/lib/discovery";
import { DotBullet, Input } from "@/components/ui";
import { PromptBlock } from "./PromptBlock";

/** One skill: how much it is used, and whether its output needs rewriting. */
export function SkillPanel({
  skill,
  name,
  usage,
  edited,
}: {
  /** The real on-disk skill, when it is installed. Absent = configured only. */
  skill?: SkillInfo;
  name: string;
  usage?: { skill: string; count: number; lastUsed: string };
  edited?: { skill: string; editRatio: number };
}) {
  const heavy = (edited?.editRatio ?? 0) > 0.4;
  const runnable = skill ? canCortexRun(skill) : null;
  const origin = skill ? sourceSentence(skill.source) : null;

  return (
    <div className="flex flex-col gap-5">
      {skill ? <p className="t-body-lg text-text">{skill.description}</p> : null}

      {origin ? <p className="t-body text-text-muted">{origin}</p> : null}

      {runnable === false ? (
        <p className="t-body border-l-2 border-warn bg-warn-tint px-3.5 py-3 text-text">
          CORTEX cannot invoke this one. It is yours, in Claude — use it in a session there. It is
          listed here so the inventory is complete, not because a task can call it.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <Metric label="Runs" value={usage ? String(usage.count) : "0"} />
        {edited ? (
          <Metric
            label="You rewrite"
            value={`${Math.round(edited.editRatio * 100)}%`}
            tone={heavy ? "warn" : undefined}
          />
        ) : null}
      </div>

      {heavy ? (
        <p className="t-body border-l-2 border-warn bg-warn-tint px-3.5 py-3 text-text">
          You rewrite most of what {name} produces. That is the signal it needs tuning — worth
          raising on your next maintenance call.
        </p>
      ) : null}

      <p className="t-body-sm text-text-muted">
        {/* "in the repo" was wrong for the ones discovered in the vault or in
            ~/.claude — the path below is the truth, so it does the work. */}
        Skills are markdown, not code. Edit this one at{" "}
        <span className="t-mono text-text">{skill?.path ?? `.claude/skills/${name}`}/SKILL.md</span>
        .
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warn";
}) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p className={`t-metric ${tone === "warn" ? "text-warn" : "text-text"}`}>{value}</p>
    </div>
  );
}

/**
 * The `/new-skill` factory (spec §8.3).
 *
 * This deliberately does NOT generate code or write a file. It produces a
 * prompt the user pastes into their own Claude session — that is trigger 2,
 * it costs the client nothing to host, and it keeps the skill authored by the
 * person who knows the job. The whole zero-infra argument lives in this flow.
 */
export function NewSkillPanel({ owner }: { owner: string }) {
  const [name, setName] = useState("");
  const [job, setJob] = useState("");

  const prompt = useMemo(() => {
    const skillName = name.trim() || "<skill-name>";
    const jobText = job.trim() || "<what it should do>";
    return [
      `Use CORTEX to build me a new skill called "${skillName}".`,
      ``,
      `What it should do: ${jobText}`,
      ``,
      `Before writing anything, interview me. Ask about:`,
      `- what triggers it, and how often`,
      `- what it should read from my vault, and what it must never touch`,
      `- the exact shape of the output, and who reads it`,
      `- one worked example of a good result, and one of a bad one`,
      ``,
      `Then write it as markdown only — no code — into skills/${skillName}/SKILL.md,`,
      `following the anatomy of the skills already in the repo. Register it in`,
      `cortex.yaml under skills.enabled. Show me the diff before you commit.`,
      ``,
      `I'm ${owner}. Match the voice of the existing skills.`,
    ].join("\n");
  }, [name, job, owner]);

  return (
    <div className="flex flex-col gap-4">
      <Input
        label="Skill name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="board-pack"
      />
      <Input
        label="What should it do?"
        value={job}
        onChange={(e) => setJob(e.target.value)}
        placeholder="Turn the month's decisions into a board pre-read"
      />

      <div className="flex items-start gap-2.5 border border-border bg-paper px-3.5 py-3">
        <DotBullet tone="blue" />
        <p className="t-body-sm text-text-muted">
          Skills are built by Claude, in your own session — not here. Paste this in and answer its
          questions.
        </p>
      </div>

      {/* The same block the scheduled-task flow ends in — one component, so
          the two "paste this into your own Claude" moments cannot drift. */}
      <PromptBlock prompt={prompt} heading="Paste this into Claude" testId="new-skill-prompt" />
    </div>
  );
}
