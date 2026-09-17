"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { DownloadDocumentLink } from "../documents/DownloadDocumentLink";
import type { ArchitectureSourceFileRow as ArchitectureSourceFileRowType } from "@/lib/data/architecture";
import { deleteArchitectureSourceFile, importArchitectureExcel } from "./actions";

export function ArchitectureSourceFileRow({
  file,
  projectId,
  projectRef,
  canEdit,
}: {
  file: ArchitectureSourceFileRowType;
  projectId: string;
  projectRef: string;
  canEdit: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5 border border-line-soft rounded-[9px]">
      <div className="min-w-0 flex-1">
        <span className="block text-[11.5px] font-semibold text-ink truncate">{file.originalName}</span>
        <span className="block font-mono text-[9px] text-muted-2 mt-0.5">
          {new Date(file.createdAt).toLocaleDateString()}
          {file.uploadedByName ? ` · ${file.uploadedByName.toUpperCase()}` : ""}
        </span>
      </div>
      <div className="flex items-center gap-1.5 flex-none">
        <DownloadDocumentLink storagePath={file.storagePath} />
        {canEdit ? (
          <>
            <Button
              variant="secondary"
              type="button"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const result = await importArchitectureExcel(projectId, projectRef, file.id);
                  toast.show(result.message, result.ok ? "success" : "error");
                })
              }
            >
              Re-import
            </Button>
            <Button
              variant="secondary"
              type="button"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await deleteArchitectureSourceFile(file.id, projectId, projectRef);
                  } catch (err) {
                    toast.show(err instanceof Error ? err.message : "Could not delete the file.", "error");
                  }
                })
              }
            >
              Delete
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
