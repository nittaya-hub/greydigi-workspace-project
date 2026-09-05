"use client";

import { useTransition } from "react";
import { markActionDone } from "./actions";

export function ActionItem({
  id,
  title,
  description,
  dueAt,
  projectRef,
}: {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  projectRef: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[12.5px] font-semibold text-ink">{title}</span>
      {description ? <span className="text-[11.5px] text-muted leading-[1.5]">{description}</span> : null}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        {dueAt ? <span className="font-mono text-[9.5px] text-block-fg">REQUESTED {new Date(dueAt).toLocaleDateString()}</span> : <span />}
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => markActionDone(id, projectRef))}
          className="bg-coral text-white rounded-[9px] px-[13px] py-[7px] text-[11px] font-semibold disabled:opacity-50"
        >
          Mark as done
        </button>
      </div>
    </div>
  );
}
