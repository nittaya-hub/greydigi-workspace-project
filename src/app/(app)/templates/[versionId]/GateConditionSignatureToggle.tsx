"use client";

import { useState, useTransition } from "react";
import { Toggle } from "@/components/ui/Toggle";
import { toggleGateConditionSignature } from "./actions";

/** Real on/off control for `template_gate_conditions.requires_signature` —
 * optimistic local state, reverted on error. Disabled while the version is
 * locked (a locked version cannot be edited; the server action also
 * enforces this). */
export function GateConditionSignatureToggle({
  conditionId,
  versionId,
  disabled,
  initialRequiresSignature,
}: {
  conditionId: string;
  versionId: string;
  disabled?: boolean;
  initialRequiresSignature: boolean;
}) {
  const [requiresSignature, setRequiresSignature] = useState(initialRequiresSignature);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-1.5 justify-self-start">
      <span className="font-mono text-[9px] tracking-[.06em] text-muted">{requiresSignature ? "DOCUMENT" : "DATA"}</span>
      <Toggle
        checked={requiresSignature}
        disabled={disabled || isPending}
        label="Requires signature"
        onChange={() => {
          const next = !requiresSignature;
          setRequiresSignature(next);
          startTransition(async () => {
            try {
              await toggleGateConditionSignature(conditionId, versionId, next);
            } catch {
              setRequiresSignature(!next);
            }
          });
        }}
      />
    </div>
  );
}
