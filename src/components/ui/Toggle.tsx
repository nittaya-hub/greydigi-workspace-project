"use client";

import clsx from "clsx";

/** Shared on/off slide switch for every boolean setting in the app —
 * connect/disconnect, business-hours-only, publish flags, etc. Purely
 * visual; the caller owns state and persistence. */
export function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={clsx(
        "relative inline-flex h-[22px] w-[38px] flex-none items-center rounded-full transition-colors disabled:opacity-50",
        checked ? "bg-ink" : "bg-line"
      )}
    >
      <span
        className={clsx(
          "inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-[2px]"
        )}
      />
    </button>
  );
}
