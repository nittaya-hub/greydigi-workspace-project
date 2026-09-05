"use client";

import { useState, useTransition } from "react";
import { revokeShareLink, regenerateShareLink } from "./actions";

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

  const url = typeof window !== "undefined" ? `${window.location.origin}/s/${token}` : `/s/${token}`;

  if (status !== "active") {
    return (
      <a
        href={`/delivery/projects/${projectRef.toLowerCase()}/share-links`}
        className="border border-line rounded-[9px] px-2 py-1 text-[10.5px] text-ink"
      >
        View audit
      </a>
    );
  }

  return (
    <div className="flex gap-1.5">
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="border border-line rounded-[9px] px-2 py-1 text-[10.5px] text-ink"
      >
        {copied ? "Copied" : "Copy"}
      </button>
      <a href={`/s/${token}`} target="_blank" rel="noreferrer" className="border border-line rounded-[9px] px-2 py-1 text-[10.5px] text-ink">
        Preview
      </a>
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => regenerateShareLink(linkId, projectRef))}
        className="border border-line rounded-[9px] px-2 py-1 text-[10.5px] text-ink disabled:opacity-50"
      >
        Regenerate
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => revokeShareLink(linkId, projectRef))}
        className="border border-line rounded-[9px] px-2 py-1 text-[10.5px] text-coral-strong disabled:opacity-50"
      >
        Revoke
      </button>
    </div>
  );
}
