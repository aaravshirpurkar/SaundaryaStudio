"use client";

import type { ReactNode } from "react";

export function Section({ title, children, accent }: { title: string; children: ReactNode; accent?: boolean }) {
  return (
    <section className="border-b border-line px-4 py-4">
      <h3 className={`mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] ${accent ? "text-coral-ink" : "text-faint"}`}>
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  unit = "",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  unit?: string;
}) {
  const display = format ? format(value) : step < 1 ? value.toFixed(2) : String(Math.round(value));
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-xs text-muted">{label}</span>
        <span className="font-mono text-[11px] text-ink tabular-nums">
          {display}
          {unit && <span className="text-faint"> {unit}</span>}
        </span>
      </div>
      <input
        type="range"
        className="slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-label={label}
      />
    </label>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group flex w-full items-center justify-between text-left"
    >
      <span className="text-xs text-muted group-hover:text-ink">
        {label}
        {hint && <span className="ml-1.5 font-mono text-[10px] text-faint">{hint}</span>}
      </span>
      <span
        className={`relative h-[18px] w-[32px] shrink-0 rounded-full border transition-colors duration-150 ${
          checked ? "border-coral/60 bg-coral/25" : "border-line bg-overlay"
        }`}
      >
        <span
          className={`absolute top-[2px] h-[12px] w-[12px] rounded-full transition-all duration-150 ${
            checked ? "left-[16px] bg-coral shadow-glow-coral" : "left-[2px] bg-faint"
          }`}
        />
      </span>
    </button>
  );
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full appearance-none rounded-md border border-line bg-overlay px-2.5 py-1.5 font-mono text-[11px] text-ink outline-none transition-colors hover:border-faint focus:border-coral"
        aria-label={label}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-panel">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[10px] uppercase text-faint">{value}</span>
        <label
          className="relative h-[20px] w-[32px] cursor-pointer overflow-hidden rounded border border-line transition-transform hover:scale-105"
          style={{ backgroundColor: value }}
          title={`${label} color`}
        >
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label={label}
          />
        </label>
      </div>
    </div>
  );
}

export function ToolButton({
  active,
  onClick,
  title,
  children,
  accent = "coral",
  disabled = false,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: ReactNode;
  accent?: "coral" | "peach";
  disabled?: boolean;
}) {
  const activeCls =
    accent === "coral"
      ? "border-coral/50 bg-coral/15 text-coral-ink"
      : "border-peach/50 bg-peach/15 text-peach-ink";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`flex h-7 w-7 items-center justify-center rounded-md border transition-all duration-100 ${
        disabled
          ? "cursor-not-allowed border-transparent text-faint/50"
          : active
            ? activeCls
            : "border-transparent text-muted hover:border-line hover:bg-overlay hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}