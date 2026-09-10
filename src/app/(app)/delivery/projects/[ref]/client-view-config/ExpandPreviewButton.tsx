"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/shadcn/dialog";
import { Button } from "@/components/shadcn/button";
import { ClientPortalView } from "@/components/portal/ClientPortalView";
import type { PortalProjectResult } from "@/lib/data/portal";
import type { ProjectBranding } from "@/lib/data/project";

/** Opens the same already-fetched draft preview at full page width, so the
 * two-column @container layout in ClientPortalView renders its normal
 * multi-column form instead of the narrower single-column one the half-width
 * embedded panel shows. No extra data fetch — reuses the `result`, `branding`
 * and `hostLogoDataUrl` the page already server-fetched for the inline
 * preview, rather than fetching a second time just for this dialog. */
export function ExpandPreviewButton({
  result,
  projectRef,
  branding,
  hostLogoDataUrl,
}: {
  result: PortalProjectResult;
  projectRef: string;
  branding?: ProjectBranding;
  hostLogoDataUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Expand</DialogTrigger>
      <DialogContent className="sm:max-w-[1140px] w-[95vw] max-h-[90vh] overflow-y-auto p-0">
        <DialogTitle className="sr-only">Full-size draft preview</DialogTitle>
        <DialogDescription className="sr-only">
          The client portal as it will look once published, at full width.
        </DialogDescription>
        <ClientPortalView
          result={result}
          projectRef={projectRef}
          interactive={false}
          frame="embedded"
          branding={branding}
          hostLogoDataUrl={hostLogoDataUrl}
        />
      </DialogContent>
    </Dialog>
  );
}
