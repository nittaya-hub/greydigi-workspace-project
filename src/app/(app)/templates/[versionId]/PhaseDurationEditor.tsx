"use client";

import { useState, useTransition } from "react";
import { Toggle } from "@/components/ui/Toggle";
import { updatePhaseDuration } from "./actions";

/** Editable "when" caption for a template phase (e.g. "Weeks 1 to 3"), plus
 * a toggle for whether it shows on the flight-plan spine at all — see
 * 0018_flight_plan_duration_labels.sql. Text saves on blur (only if it
 * changed); the toggle saves immediately. Both revert to their prior value
 * on a failed save. Disabled while the version is locked. */
export function PhaseDurationEditor({
  phaseId,
  versionId,
  disabled,
  initialDurationLabel,
  initialShowDurationLabel,
}: {
  phaseId: string;
  versionId: string;
  disabled?: boolean;
  initialDurationLabel: string | null;
  initialShowDurationLabel: boolean;
}) {
  const [label, setLabel] = useState(initialDurationLabel ?? "");
  const [show, setShow] = useState(initialShowDurationLabel);
  const [isPending, startTransition] = useTransition();

  function save(nextLabel: string, nextShow: boolean) {
    startTransition(async () => {
      try {
        await updatePhaseDuration(phaseId, versionId, nextLabel, nextShow);
      } catch {
        setLabel(initialDurationLabel ?? "");
        setShow(initialShowDurationLabel);
      }
    });
  }

  return (
    <div className="flex items-center gap-1.5 justify-self-start">
      <input
        value={label}
        disabled={disabled || isPending}
        placeholder="e.g. Weeks 1 to 3"
        onChange={(e) => setLabel(e.target.value)}
        onBlur={() => {
          if (label !== (initialDurationLabel ?? "")) save(label, show);
        }}
        className="border border-line bg-white rounded-[7px] px-2 py-1 text-[11.5px] w-[130px] disabled:opacity-60"
      />
      <Toggle
        checked={show}
        disabled={disabled || isPending}
        label="Show duration label"
        onChange={() => {
          const next = !show;
          setShow(next);
          save(label, next);
        }}
      />
    </div>
  );
}
