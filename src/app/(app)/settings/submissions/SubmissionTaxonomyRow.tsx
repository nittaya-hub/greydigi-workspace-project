"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/shadcn/input";
import { Switch } from "@/components/shadcn/switch";
import { updateSubmissionTaxonomyOption } from "../actions";

export function SubmissionTaxonomyRow({
  optionId,
  workspaceId,
  value,
  label,
  isActive,
}: {
  optionId: string;
  workspaceId: string;
  value: string;
  label: string;
  isActive: boolean;
}) {
  const [labelValue, setLabelValue] = useState(label);
  const [active, setActive] = useState(isActive);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function save(next: { label: string; isActive: boolean }) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await updateSubmissionTaxonomyOption(optionId, workspaceId, next);
        setSaved(true);
        setTimeout(() => setSaved(false), 1200);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save.");
      }
    });
  }

  return (
    <div className="grid grid-cols-[100px_1fr_auto_60px] items-center gap-2.5 px-4 py-[9px] text-[12px] border-b border-line-soft last:border-b-0">
      <span className="font-mono text-[10px] text-muted truncate" title={value}>
        {value}
      </span>
      <Input
        value={labelValue}
        onChange={(e) => setLabelValue(e.target.value)}
        onBlur={() => {
          if (labelValue.trim() && labelValue !== label) save({ label: labelValue, isActive: active });
        }}
        className="text-[11.5px]"
        disabled={isPending}
      />
      <div className="flex items-center gap-1.5">
        <Switch
          checked={active}
          onCheckedChange={(next: boolean) => {
            setActive(next);
            save({ label: labelValue, isActive: next });
          }}
          disabled={isPending}
        />
        <span className="text-[10.5px] text-muted">{active ? "Active" : "Retired"}</span>
      </div>
      <span className="text-[10px] text-muted-2 text-right">{isPending ? "..." : saved ? "Saved" : ""}</span>
      {error ? <span className="col-span-4 text-[11px] text-block-fg">{error}</span> : null}
    </div>
  );
}
