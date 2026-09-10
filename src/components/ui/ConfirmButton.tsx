"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";

/** Themed replacement for `window.confirm` — every destructive action in
 * this app should route through this, not the browser's own unstyled
 * dialog (which carries the browser chrome/URL, not the app's look).
 * Wraps the shared Modal the same way DeleteProjectButton already did by
 * hand; this just makes that pattern reusable for the smaller, one-line
 * confirmations (delete a task, remove a member) that don't need their
 * own bespoke modal. */
export function ConfirmButton({
  trigger,
  triggerClassName,
  triggerLabel,
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
}: {
  /** Custom trigger content (e.g. an icon) — takes precedence over triggerLabel. */
  trigger?: ReactNode;
  triggerClassName?: string;
  /** Plain-text trigger, for callers that just need a label (e.g. "REMOVE"). */
  triggerLabel?: ReactNode;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  onConfirm: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={triggerClassName} aria-haspopup="dialog">
        {trigger ?? triggerLabel}
      </button>
      <Modal open={open} onClose={() => (isPending ? null : setOpen(false))} title={title}>
        <div className="flex flex-col gap-3">
          <p className="m-0 text-[12px] text-ink-soft leading-[1.55]">{message}</p>
          {error ? <p className="m-0 text-[11.5px] text-block-fg leading-[1.5]">{error}</p> : null}
          <Button
            variant="coral"
            type="button"
            disabled={isPending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                try {
                  await onConfirm();
                  setOpen(false);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Something went wrong.");
                }
              });
            }}
          >
            {isPending ? "Working…" : confirmLabel}
          </Button>
        </div>
      </Modal>
    </>
  );
}
