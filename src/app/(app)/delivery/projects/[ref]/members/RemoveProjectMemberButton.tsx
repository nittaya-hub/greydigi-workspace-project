"use client";

import { useTransition } from "react";
import { removeProjectMember } from "./actions";

export function RemoveProjectMemberButton({
  projectId,
  projectRef,
  memberId,
}: {
  projectId: string;
  projectRef: string;
  memberId: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => removeProjectMember(projectId, projectRef, memberId))}
      className="font-mono text-[9.5px] tracking-[.04em] text-muted hover:text-block-fg disabled:opacity-50"
    >
      {isPending ? "REMOVING…" : "REMOVE"}
    </button>
  );
}
