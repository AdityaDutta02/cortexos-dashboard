"use client";

import { useTheme } from "@/lib/theme";
import { Eyebrow } from "@/components/ui";

const SURFACES = [
  "bg",
  "bg-alt",
  "paper",
  "paper-blue",
  "blue-paper",
  "blue-tint",
  "card-blue",
  "panel",
  "strip",
];
const BRAND = ["blue", "blue-light", "blue-hover"];
const STATUS = ["ok", "ok-tint", "warn", "warn-tint", "danger", "danger-tint", "neutral", "neutral-tint"];
const LINES = ["border", "border-light", "border-strong"];

/**
 * Every colour token, resolved live from CSS custom properties so the values
 * shown are the ones actually painting — including in dark mode.
 */
export function Swatches() {
  const { resolved } = useTheme();
  return (
    <div className="flex flex-col gap-6" data-theme-resolved={resolved}>
      <Group title="Surfaces" names={SURFACES} />
      <Group title="Brand" names={BRAND} />
      <Group title="Status" names={STATUS} />
      <Group title="Lines" names={LINES} border />
    </div>
  );
}

function Group({ title, names, border }: { title: string; names: string[]; border?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <Eyebrow>{title}</Eyebrow>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {names.map((name) => (
          <div key={name} className="border border-border">
            <div
              className={border ? "h-12 border-b-4" : "h-12"}
              style={
                border
                  ? { borderBottomColor: `var(--color-${name})` }
                  : { background: `var(--color-${name})` }
              }
            />
            <p className="border-t border-border px-2 py-1 font-mono text-[10.5px] text-text-muted">
              --color-{name}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
