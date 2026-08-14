"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/format";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    "border-blue bg-blue text-on-blue hover:bg-blue-hover disabled:bg-blue/50 disabled:border-blue/50",
  secondary:
    "border-border bg-bg text-text hover:bg-blue-tint hover:border-border-strong disabled:text-text-dim",
  ghost:
    "border-transparent bg-transparent text-text-muted hover:text-text hover:bg-blue-tint disabled:text-text-dim",
  danger:
    "border-danger bg-danger-tint text-danger hover:bg-danger hover:text-bg disabled:opacity-50",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-9 px-4 text-[14.5px] gap-2",
  lg: "h-11 px-5 text-[15px] gap-2",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and blocks clicks. Keeps its width so layout never jumps. */
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  /** Stretches to the container. */
  block?: boolean;
}

/**
 * The one button. Square corners, hairline border, blue as the only accent —
 * the reference build's idiom, not a rounded SaaS button.
 */
export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  iconLeft,
  iconRight,
  block = false,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "relative inline-flex items-center justify-center border font-body font-medium tracking-[-0.01em]",
        "transition-colors duration-200 disabled:cursor-not-allowed",
        VARIANT[variant],
        SIZE[size],
        block && "w-full",
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner /> : iconLeft}
      <span className={cn(loading && "opacity-70")}>{children}</span>
      {!loading && iconRight}
    </button>
  );
}

/**
 * 12px ring spinner in currentColor. Exported because "a run is working" is not
 * a button — the run panel needs the same mark outside one, and a second
 * hand-rolled spinner would drift from this one within a release.
 */
export function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent"
    />
  );
}
