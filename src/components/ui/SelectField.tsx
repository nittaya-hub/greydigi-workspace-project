"use client";

import type { ReactNode } from "react";
import { Select as SelectPrimitive, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shadcn/select";

export interface SelectFieldOption {
  value: string;
  label: ReactNode;
}

/** Form-participating select styled with the app's theme, replacing the
 * browser's native <select> popup (which renders with OS chrome and
 * ignores the app's CSS entirely). Base UI's Select.Root renders a hidden
 * input synced to the selected value, so this drops into the existing
 * `new FormData(form)` server-action pattern unchanged: `name`, `required`
 * and `defaultValue` behave exactly like a native select.
 *
 * Leave `defaultValue` unset for a "must actively choose" field (shows
 * `placeholder` until picked); pass `defaultValue=""` with a `""`-valued
 * option in `options` for a real "no selection" choice — matches the two
 * patterns the native selects used across the app. */
export function SelectField({
  name,
  defaultValue,
  required,
  disabled,
  placeholder,
  options,
  className = "w-full",
}: {
  name: string;
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  options: SelectFieldOption[];
  className?: string;
}) {
  return (
    <SelectPrimitive
      name={name}
      defaultValue={defaultValue}
      required={required}
      disabled={disabled}
      // Base UI's <Select.Value> only renders a resolved label when the
      // root is given this items map — without it, the closed trigger
      // falls back to the raw stored value (a uuid, here) instead of the
      // option's label, even though the open dropdown itself shows the
      // right names. Every SelectField across the app shares this one
      // fix instead of each caller working around it individually (see
      // TaskDrawer.tsx, which hand-rolled this same fix before this
      // component covered it).
      items={options.map((o) => ({ value: o.value, label: o.label }))}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </SelectPrimitive>
  );
}
