"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/shadcn/dialog";
import { Button } from "@/components/shadcn/button";
import { ArchitectureDiagram } from "./ArchitectureDiagram";
import type { ProjectArchitectureData } from "@/lib/data/architecture";

/** Same "Expand" pattern as ExpandPreviewButton (client-view-config) --
 * the diagram at full viewport width instead of squeezed into the
 * card's own column, for exactly the "clear lines, easy to read" ask
 * a cramped inline view can't give. Read-only here on purpose: editing
 * belongs on the page itself, not a full-screen viewer. */
export function ExpandArchitectureButton({
  data,
  projectId,
  projectRef,
}: {
  data: ProjectArchitectureData;
  projectId: string;
  projectRef: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Expand</DialogTrigger>
      <DialogContent className="sm:max-w-[1240px] w-[97vw] max-h-[92vh] overflow-y-auto">
        <DialogTitle>Solution architecture</DialogTitle>
        <DialogDescription>Read-only, full-width view. Close this to edit.</DialogDescription>
        <ArchitectureDiagram data={data} projectId={projectId} projectRef={projectRef} canEdit={false} />
      </DialogContent>
    </Dialog>
  );
}
