"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { updateSlaPolicy } from "../actions";

export function SlaPolicyRow({
  policyId,
  workspaceId,
  serviceName,
  responseTargetMinutes,
  resolveTargetMinutes,
  businessHoursOnly,
}: {
  policyId: string;
  workspaceId: string;
  serviceName: string;
  responseTargetMinutes: number;
  resolveTargetMinutes: number;
  businessHoursOnly: boolean;
}) {
  const [response, setResponse] = useState(responseTargetMinutes);
  const [resolve, setResolve] = useState(resolveTargetMinutes);
  const [businessHours, setBusinessHours] = useState(businessHoursOnly);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="grid grid-cols-[1fr_100px_100px_120px_84px] gap-2.5 items-center px-4 py-[11px] text-[12px] border-b border-line-soft last:border-b-0">
      <span className="text-[12.5px] font-semibold text-ink truncate">{serviceName}</span>
      <input
        type="number"
        min={1}
        value={response}
        onChange={(e) => setResponse(Number(e.target.value))}
        className="border border-line bg-white rounded-[7px] px-2 py-1 text-[11.5px] w-full"
      />
      <input
        type="number"
        min={1}
        value={resolve}
        onChange={(e) => setResolve(Number(e.target.value))}
        className="border border-line bg-white rounded-[7px] px-2 py-1 text-[11.5px] w-full"
      />
      <div className="flex items-center gap-1.5">
        <Toggle checked={businessHours} onChange={() => setBusinessHours((v) => !v)} label="Business hours only" />
        <span className="text-[10.5px] text-muted">Business hrs only</span>
      </div>
      <Button
        variant="secondary"
        className="!px-2 !py-1 !text-[10.5px]"
        disabled={isPending}
        onClick={() => {
          setError(null);
          setSaved(false);
          startTransition(async () => {
            try {
              await updateSlaPolicy(policyId, serviceName, workspaceId, {
                responseTargetMinutes: response,
                resolveTargetMinutes: resolve,
                businessHoursOnly: businessHours,
              });
              setSaved(true);
              setTimeout(() => setSaved(false), 1500);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not save.");
            }
          });
        }}
      >
        {isPending ? "Saving..." : saved ? "Saved" : "Save"}
      </Button>
      {error ? <span className="col-span-5 text-[11px] text-block-fg">{error}</span> : null}
    </div>
  );
}
