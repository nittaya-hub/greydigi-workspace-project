"use client";

import { useState, useTransition } from "react";
import { revokeShareLink, regenerateShareLink, fetchShareLinkAudit } from "./actions";
import { getSiteUrl } from "@/lib/site-url";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { ShareLinkAuditRow } from "@/lib/data/project";

const actionButtonClass =
  "min-h-[40px] inline-flex items-center justify-center border border-line rounded-[9px] px-2.5 text-[10.5px] text-ink disabled:opacity-50 touch-manipulation";

function ViewAuditButton({ linkId }: { linkId: string }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ShareLinkAuditRow[] | null>(null);
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  function openModal() {
    setOpen(true);
    if (rows) return;
    startTransition(async () => {
      try {
        setRows(await fetchShareLinkAudit(linkId));
      } catch (err) {
        toast.show(err instanceof Error ? err.message : "Couldn't load the view log.", "error");
        setOpen(false);
      }
    });
  }

  return (
    <>
      <button type="button" onClick={openModal} className={actionButtonClass}>
        View audit
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Who's viewed this link">
        {isPending && !rows ? (
          <p className="m-0 text-[12px] text-muted">Loading...</p>
        ) : !rows || rows.length === 0 ? (
          <p className="m-0 text-[12px] text-muted">No views logged yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center justify-between gap-3 border-b border-line-soft pb-2 last:border-b-0 last:pb-0">
                <span className="text-[12px] text-ink">{new Date(r.viewedAt).toLocaleString()}</span>
                <span className="text-[11px] text-muted font-mono">
                  {[r.ipCity, r.ipCountry].filter(Boolean).join(", ") || "Location unknown"}
                </span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
}

export function ShareLinkActions({
  linkId,
  token,
  projectRef,
  status,
}: {
  linkId: string;
  token: string;
  projectRef: string;
  status: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const origin = getSiteUrl();
  const url = origin ? `${origin}/s/${token}` : `/s/${token}`;

  if (status !== "active") {
    return <ViewAuditButton linkId={linkId} />;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className={actionButtonClass}
      >
        {copied ? "Copied" : "Copy"}
      </button>
      <a href={`/s/${token}`} target="_blank" rel="noreferrer" className={actionButtonClass}>
        Preview
      </a>
      <ViewAuditButton linkId={linkId} />
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            try {
              await regenerateShareLink(linkId, projectRef);
              toast.show("Link regenerated.", "success");
            } catch (err) {
              toast.show(err instanceof Error ? err.message : "Couldn't regenerate the link.", "error");
            }
          })
        }
        className={actionButtonClass}
      >
        Regenerate
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            try {
              await revokeShareLink(linkId, projectRef);
              toast.show("Link revoked.", "success");
            } catch (err) {
              toast.show(err instanceof Error ? err.message : "Couldn't revoke the link.", "error");
            }
          })
        }
        className={`${actionButtonClass} text-coral-strong`}
      >
        Revoke
      </button>
    </div>
  );
}
