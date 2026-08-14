"use client";

/**
 * The three camera buttons in the canvas's top-right corner.
 *
 * Split out of `GraphView` only to keep that file under the 500-line rule;
 * they carry no state and never touch the simulation.
 */
export function CamControls({
  onZoomIn,
  onZoomOut,
  onFit,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}) {
  return (
    <div className="absolute top-2.5 right-2.5 flex flex-col gap-1">
      <CamButton label="Zoom in" glyph="+" onClick={onZoomIn} />
      <CamButton label="Zoom out" glyph="−" onClick={onZoomOut} />
      <CamButton label="Fit to view" glyph="⊡" onClick={onFit} testId="graph-fit" />
    </div>
  );
}

function CamButton({
  label,
  glyph,
  onClick,
  testId,
}: {
  label: string;
  glyph: string;
  onClick: () => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      data-testid={testId}
      className="flex h-7 w-7 items-center justify-center border border-border bg-bg/85 text-[13px] leading-none text-text-muted backdrop-blur-[6px] transition-colors hover:border-blue hover:text-blue"
    >
      <span aria-hidden>{glyph}</span>
    </button>
  );
}
