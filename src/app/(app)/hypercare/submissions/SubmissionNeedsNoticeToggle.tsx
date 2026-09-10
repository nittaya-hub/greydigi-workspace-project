"use client";

import { useState, useTransition } from "react";
import clsx from "clsx";
import { toggleSubmissionNeedsClientNotice } from "./actions";

/** A plain in-system reminder flag -- no real email/SMS ever goes out
 * from this. Turning it on broadcasts an internal notification so
 * whoever's next on shift knows to tell the client; turning it off is
 * silent, same as marking a submission resolved doesn't re-notify. */
export function SubmissionNeedsNoticeToggle({ submissionId, needsClientNotice }: { submissionId: string; needsClientNotice: boolean }) {
  const [value, setValue] = useState(needsClientNotice);
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        const next = !value;
        setValue(next);
        startTransition(async () => {
          try {
            await toggleSubmissionNeedsClientNotice(submissionId, next);
          } catch {
            setValue(value);
          }
        });
      }}
      className={clsx(
        "font-mono text-[10px] tracking-[.04em] rounded-[6px] px-2.5 py-1.5 border transition-colors disabled:opacity-50",
        value ? "bg-block-bg text-block-fg border-transparent" : "border-line text-muted hover:text-ink"
      )}
    >
      {value ? "🔔 NEEDS TO NOTIFY CLIENT" : "Flag: notify client when handled"}
    </button>
  );
}
