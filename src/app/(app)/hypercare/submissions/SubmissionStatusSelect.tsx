"use client";

import { useState, useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shadcn/select";
import { updateSubmissionStatus } from "./actions";
import type { ClientSubmissionStatus } from "@/lib/supabase/database.types";

const OPTIONS: ClientSubmissionStatus[] = ["open", "in_progress", "resolved"];

export function SubmissionStatusSelect({ submissionId, status }: { submissionId: string; status: ClientSubmissionStatus }) {
  const [value, setValue] = useState(status);
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      value={value}
      disabled={isPending}
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
      <SelectTrigger className="h-auto rounded-[6px] px-2 py-1 text-[10.5px] font-mono uppercase justify-self-start">
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
