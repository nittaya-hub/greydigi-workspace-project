"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Modal, Field, fieldInputClass } from "@/components/ui/Modal";
import { grantPortalAccess, type PortalAccessResult } from "./actions";

export function PortalAccessButton({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<PortalAccessResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setResult(null);
    setCopied(false);
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Portal access
      </Button>
      <Modal open={open} onClose={close} title="Grant portal access">
        {result?.ok ? (
          <div className="flex flex-col gap-4">
            <div className="bg-ok-bg border border-ok-fg/30 rounded-[9px] p-4 flex flex-col gap-3">
              <span className="text-[12.5px] text-ok-fg leading-[1.5]">{result.message}</span>
              {result.temporaryPassword ? (
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white border border-line rounded-[7px] px-3 py-2 text-[13px] font-mono">
                    {result.temporaryPassword}
                  </code>
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(result.temporaryPassword!);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                    className="border border-line bg-white rounded-[9px] px-3 py-2 text-[11.5px] text-ink"
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              ) : null}
            </div>
            <Button variant="primary" onClick={close}>
              Done
            </Button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              startTransition(async () => {
                const res = await grantPortalAccess(clientId, formData);
                setResult(res);
              });
            }}
            className="flex flex-col gap-3"
          >
            <Field label="CONTACT FULL NAME">
              <input name="fullName" required autoFocus className={fieldInputClass} placeholder="Jane Doe" />
            </Field>
            <Field label="EMAIL">
              <input name="email" type="email" required className={fieldInputClass} placeholder="jane@client.com" />
            </Field>

            {result && !result.ok ? <p className="text-[11.5px] text-block-fg leading-[1.5]">{result.message}</p> : null}

            <Button variant="primary" type="submit" disabled={isPending}>
              {isPending ? "Granting..." : "Grant access"}
            </Button>
          </form>
        )}
      </Modal>
    </>
  );
}
