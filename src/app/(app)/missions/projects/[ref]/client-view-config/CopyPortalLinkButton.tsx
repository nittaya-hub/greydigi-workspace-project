"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { getSiteUrl } from "@/lib/site-url";

/** Client-side only — no server round trip needed to copy a link. Mirrors
 * the copy pattern in share-links/ShareLinkActions.tsx (getSiteUrl(),
 * a brief "Copied" confirmation state). The portal link is the project's
 * own ref, lower-cased, same as every other /portal/[ref] route in the app.
 * Rendered inside the PUBLISHED status card as a share-dialog-style row:
 * a read-only URL field plus a Copy Link button beside it, rather than a
 * lone header button — the URL itself should be visible, not just copyable. */
export function CopyPortalLinkButton({ projectRef }: { projectRef: string }) {
  const [copied, setCopied] = useState(false);
  const origin = getSiteUrl();
  const url = origin ? `${origin}/portal/${projectRef.toLowerCase()}` : `/portal/${projectRef.toLowerCase()}`;

  return (
    <div className="flex items-center gap-2 w-full">
      <input
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="flex-1 min-w-0 border border-line bg-white rounded-full px-3.5 py-2 text-[12px] text-muted font-mono truncate"
      />
      <Button
        type="button"
        variant="primary"
        className="flex-none !rounded-full"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? "Copied" : "Copy Link"}
      </Button>
    </div>
  );
}
