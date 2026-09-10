"use client";

import { useState, type MouseEvent } from "react";
import { CalendarIcon } from "lucide-react";
import { cn } from "cn";
import { Calendar } from "@/components/shadcn/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/shadcn/popover";

function parseISODate(value?: string | null): Date | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplay(value: string): string {
  const date = parseISODate(value);
  return date ? date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "";
}

/** Themed replacement for the browser's native `<input type="date">`,
 * which renders an unstyled OS calendar popup that ignores the app's CSS
 * entirely — the same class of bug SelectField.tsx already fixed for
 * `<select>`. Value/onChange use the same "yyyy-mm-dd" string the native
 * input used, so this drops into existing controlled state
 * (PublishReportForm.tsx, TaskPhaseGroup.tsx) unchanged.
 *
 * Pass `name` (with an optional `defaultValue`) instead of `value`/
 * `onChange` for an uncontrolled form field — a hidden input keeps it
 * participating in `new FormData(form)` exactly like the native input
 * did (AddClientButton.tsx, CreateProjectButton.tsx, and friends). */
export function DatePicker({
  id,
  name,
  value,
  defaultValue,
  onChange,
  placeholder = "Pick a date",
  disabled,
  className = "w-full",
  onClick,
}: {
  id?: string;
  name?: string;
  value?: string | null;
  defaultValue?: string | null;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onClick?: (e: MouseEvent) => void;
}) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue ?? "");
  const current = isControlled ? value ?? "" : internal;
  const [open, setOpen] = useState(false);

  function handleSelect(date: Date | undefined) {
    const next = date ? toISODate(date) : "";
    if (!isControlled) setInternal(next);
    onChange?.(next);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {name ? <input type="hidden" name={name} value={current} /> : null}
      <PopoverTrigger
        id={id}
        disabled={disabled}
        onClick={onClick}
        className={cn(
          "flex h-8 items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pl-2.5 pr-2 text-left text-[12.5px] outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:hover:bg-input/50",
          !current && "text-muted-foreground",
          className
        )}
      >
        <span className="truncate">{current ? formatDisplay(current) : placeholder}</span>
        <CalendarIcon className="size-3.5 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={parseISODate(current)} onSelect={handleSelect} />
      </PopoverContent>
    </Popover>
  );
}
