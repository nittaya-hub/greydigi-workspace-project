"use client";

import { useState, useTransition } from "react";
import clsx from "clsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shadcn/select";
import { updateSubmissionStatus } from "./actions";
import type { ClientSubmissionStatus } from "@/lib/supabase/database.types";

const OPTIONS: ClientSubmissionStatus[] = ["open", "in_progress", "resolved"];

// Same red/orange/green convention as the Tasks table's status colors
// (TaskPhaseGroup.tsx's STATUS_SELECT_CLASSES) — open is red rather than
// grey, since an open client submission is a live, unaddressed thing
// someone is waiting on, not "not started yet."
const STATUS_CLASSES: Record<ClientSubmissionStatus, string> = {
  open: "bg-block-bg text-block-fg",
  in_progress: "bg-coral-tint text-coral-strong",
  resolved: "bg-ok-bg text-ok-fg",
};

export function SubmissionStatusSelect({ submissionId, status }: { submissionId: string; status: ClientSubmissionStatus }) {
  const [value, setValue] = useState(status);
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      value={value}
      disabled={isPending}
      // Same fix as SelectField.tsx — Base UI's <Select.Value> only
      // resolves a label from this items map, not from the SelectItem
      // children alone, so the closed trigger would otherwise show the
      // raw enum value instead of the "open"/"in progress" label.
      items={OPTIONS.map((o) => ({ value: o, label: o.replace(/_/g, " ") }))}
      onValueChange={(next) => {
        const nextStatus = next as ClientSubmissionStatus;
        setValue(nextStatus);
        startTransition(async () => {
          try {
            await updateSubmissionStatus(submissionId, nextStatus);
          } catch {
            setValue(status);
          }
        });
      }}
    >
      <SelectTrigger className={clsx("h-auto rounded-[6px] border-transparent px-2 py-1 text-[10.5px] font-mono uppercase justify-self-start", STATUS_CLASSES[value])}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((o) => (
          <SelectItem key={o} value={o} className="text-[10.5px] font-mono uppercase">
            {o.replace(/_/g, " ")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
