"use client";

import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { useId } from "react";
import { cn } from "@/lib/format";

const CONTROL =
  "w-full border border-border bg-bg px-3 font-body text-[14px] text-text placeholder:text-text-dim " +
  "transition-colors duration-200 hover:border-border-strong focus:border-blue disabled:bg-paper disabled:text-text-dim";

/** Label + control + hint/error wrapper. Wires htmlFor/aria-describedby for you. */
export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="eyebrow text-text">
        {label}
      </label>
      {children}
      {error ? (
        <p className="font-body text-[12.5px] text-danger">{error}</p>
      ) : hint ? (
        <p className="font-body text-[12.5px] text-text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

/** Single-line text input. Square, hairline, blue focus border. */
export function Input({ label, hint, error, className, id, ...rest }: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const control = (
    <input
      id={inputId}
      aria-invalid={error ? true : undefined}
      className={cn(CONTROL, "h-9", error && "border-danger", className)}
      {...rest}
    />
  );
  if (!label) return control;
  return (
    <Field label={label} hint={hint} error={error} htmlFor={inputId}>
      {control}
    </Field>
  );
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

/** Multi-line input. Used by the "that's wrong" correction box (spec §6.5). */
export function Textarea({ label, hint, error, className, id, rows = 4, ...rest }: TextareaProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const control = (
    <textarea
      id={inputId}
      rows={rows}
      aria-invalid={error ? true : undefined}
      className={cn(CONTROL, "py-2 leading-[21px]", error && "border-danger", className)}
      {...rest}
    />
  );
  if (!label) return control;
  return (
    <Field label={label} hint={hint} error={error} htmlFor={inputId}>
      {control}
    </Field>
  );
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  options: { value: string; label: string }[];
}

/** Native select — keyboard and screen-reader behaviour for free. */
export function Select({ label, hint, options, className, id, ...rest }: SelectProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const control = (
    <select id={inputId} className={cn(CONTROL, "h-9 pr-8", className)} {...rest}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
  if (!label) return control;
  return (
    <Field label={label} hint={hint} htmlFor={inputId}>
      {control}
    </Field>
  );
}

/**
 * Toggle — a switch built on a real checkbox input, so space/enter and
 * screen readers work without any extra wiring.
 */
export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <span className="relative inline-flex shrink-0 pt-0.5">
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="peer h-5 w-9 cursor-pointer appearance-none border border-border bg-paper transition-colors duration-200 checked:border-blue checked:bg-blue disabled:cursor-not-allowed disabled:opacity-50"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute top-[3px] left-[3px] h-3.5 w-3.5 bg-text transition-transform duration-200 ease-[var(--ease-out-expo)] peer-checked:translate-x-4 peer-checked:bg-on-blue"
        />
      </span>
      <label htmlFor={id} className="cursor-pointer select-none">
        <span className="block font-body text-[14px] font-medium text-text">{label}</span>
        {description ? (
          <span className="block font-body text-[12.5px] leading-[19px] text-text-muted">
            {description}
          </span>
        ) : null}
      </label>
    </div>
  );
}
