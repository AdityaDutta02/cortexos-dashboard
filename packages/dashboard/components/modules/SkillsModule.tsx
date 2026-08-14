"use client";

import type { ObservedSignals, SkillInfo } from "cortexos-types";
import { byUsefulnessThenName, canCortexRun, sourceSentence, sourceTag } from "@/lib/discovery";
import { CappedList, EmptyState, Module, ModuleAdd } from "@/components/ui";

/**
 * Skills — the ones that exist on disk, wherever they live.
 *
 * Two rounds of the same bug. First this rendered `config.skills.enabled`, a
 * wish list naming five skills against one on disk, so four rows were phantoms
 * whose click would fail. Then it read only the repo's `.claude/skills/`,
 * which reported **one** skill to a user with three in his vault and dozens in
 * `~/.claude/skills/`. Discovery now spans repo, vault and user, and this
 * renders what it finds — with the origin on the row, because "shipped with
 * CORTEX" and "yours, in Claude" are different things.
 *
 * `invocable` gets words rather than a colour: whether CORTEX can actually run
 * a skill is a correctness signal, and a greyed row would be read as "disabled"
 * rather than "visible but not wired".
 */
export function SkillsModule({
  skills,
  missing,
  signals,
  onOpen,
  onNew,
}: {
  skills: SkillInfo[];
  missing: string[];
  signals: ObservedSignals;
  onOpen: (name: string) => void;
  onNew: () => void;
}) {
  const usage = new Map(signals.skillUsage.map((s) => [s.skill, s.count]));
  const edited = new Map(signals.heavilyEditedSkills.map((s) => [s.skill, s.editRatio]));
  const max = Math.max(1, ...signals.skillUsage.map((s) => s.count));
  const rows = byUsefulnessThenName(
    skills.map((s) => ({ ...s, label: s.name })),
    canCortexRun,
  );
  // Two groups, because on a real machine the split is 1 and 130 and an
  // undifferentiated list of 131 rows hides the one CORTEX can actually run.
  const runnable = rows.filter((s) => canCortexRun(s) !== false);
  const theirs = rows.filter((s) => canCortexRun(s) === false);

  const row = (skill: (typeof rows)[number]) => {
    const count = usage.get(skill.name) ?? 0;
    const ratio = edited.get(skill.name);
    const heavy = (ratio ?? 0) > 0.4;
    const invocable = canCortexRun(skill) !== false;
    const origin = sourceTag(skill.source);
    return (
      <li key={`${skill.source}-${skill.name}`}>
        <button
          type="button"
          onClick={() => onOpen(skill.name)}
          title={[
            skill.description,
            sourceSentence(skill.source),
            heavy ? "You rewrite most of its output." : "",
          ]
            .filter(Boolean)
            .join(" ")}
          className="block w-full px-1 py-1 text-left"
        >
          <span className="mb-1 flex items-baseline justify-between gap-2">
            <span
              className={`t-body min-w-0 truncate ${invocable ? "text-text" : "text-text-muted"}`}
            >
              {skill.name}
            </span>
            <span className="flex shrink-0 items-baseline gap-2">
              {origin ? <span className="t-mono text-text-dim">{origin}</span> : null}
              {invocable ? <span className="t-mono text-text-dim">{count}</span> : null}
            </span>
          </span>
          {/* The bar ranks what CORTEX has actually run. A skill it cannot
              invoke has no run history to rank, so it gets a hairline rather
              than a bar that would read as "used zero times". */}
          {invocable ? (
            <span className="relative block h-1.5 w-full bg-neutral-tint">
              <span
                className={`absolute inset-y-0 left-0 ${heavy ? "bg-warn" : "bg-blue"}`}
                style={{ width: `${Math.max(4, (count / max) * 100)}%` }}
              />
            </span>
          ) : (
            <span className="block h-px w-full bg-border" />
          )}
        </button>
      </li>
    );
  };

  return (
    <Module
      label="Skills"
      value={<span className="t-mono text-text-dim">{skills.length}</span>}
      action={<ModuleAdd label="Create a new skill" onClick={onNew} />}
    >
      {rows.length === 0 ? (
        <EmptyState
          title="No skills found"
          detail={
            missing.length > 0
              ? `${missing.length} named in your config are not on disk yet. Build one with +.`
              : "Nothing in this repo, your vault, or ~/.claude/skills. Build one with + — it writes itself in your own Claude session."
          }
        />
      ) : (
        <div data-testid="skill-list">
          {runnable.length > 0 ? (
            <CappedList count={runnable.length} label="skills" className="gap-2.5">{runnable.map(row)}</CappedList>
          ) : null}

          {theirs.length > 0 ? (
            <section className={runnable.length > 0 ? "mt-3 border-t border-border/50 pt-2" : ""}>
              <p className="eyebrow">In your Claude · {theirs.length}</p>
              {/*
                The one sentence this module spends. Whether CORTEX can run a
                skill is a correctness signal, and "visible" and "runnable" are
                exactly the two things a row of grey text cannot separate.
              */}
              <p data-testid="skills-not-invocable" className="t-caption mt-0.5 mb-2 text-text-dim">
                Found in your own Claude setup. Use them in a session there — CORTEX cannot invoke
                them.
              </p>
              <CappedList count={theirs.length} label="skills" className="gap-2.5">{theirs.map(row)}</CappedList>
            </section>
          ) : null}
        </div>
      )}

      {rows.length > 0 && missing.length > 0 ? (
        /* Drift between cortex.yaml and disk. One quiet line, not a warning:
           a template naming skills you have not built yet is normal. */
        <p
          data-testid="skills-missing"
          title={missing.join(", ")}
          className="t-caption mt-2.5 border-t border-border/50 pt-2 text-text-dim"
        >
          {missing.length} more in your config, not built yet
        </p>
      ) : null}
    </Module>
  );
}
