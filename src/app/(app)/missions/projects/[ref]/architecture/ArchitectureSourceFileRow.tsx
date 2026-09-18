"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { DownloadDocumentLink } from "../documents/DownloadDocumentLink";
import type { ArchitectureSourceFileRow as ArchitectureSourceFileRowType } from "@/lib/data/architecture";
import { deleteArchitectureSourceFile, importArchitectureExcel, compareArchitectureExcelToDiagram, type ArchitectureExcelComparison } from "./actions";

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
  const [comparison, setComparison] = useState<ArchitectureExcelComparison | null>(null);
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
                  const result = await compareArchitectureExcelToDiagram(projectId, file.id);
                  if (result.ok) setComparison(result.result);
                  else toast.show(result.message, "error");
                })
              }
            >
              Compare
            </Button>
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

      <Modal open={!!comparison} onClose={() => setComparison(null)} title={`Compare against ${file.originalName}`}>
        {comparison ? (
          <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
            <div className="flex gap-4">
              <span className="font-mono text-[9.5px] text-muted">MATCHED · {comparison.matched.length}</span>
              <span className="font-mono text-[9.5px] text-muted">MISSING FROM DIAGRAM · {comparison.missingFromDiagram.length}</span>
              <span className="font-mono text-[9.5px] text-muted">MISSING FROM EXCEL · {comparison.missingFromExcel.length}</span>
            </div>

            {comparison.missingFromDiagram.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-ink">In the spreadsheet, not yet on the diagram</span>
                <div className="flex flex-col gap-1">
                  {comparison.missingFromDiagram.map((m, i) => (
                    <span key={i} className="text-[11px] text-muted">
                      {m.column} <span className="text-muted-2">·</span> {m.node}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {comparison.missingFromExcel.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-ink">On the diagram, not in the spreadsheet</span>
                <div className="flex flex-col gap-1">
                  {comparison.missingFromExcel.map((label) => (
                    <span key={label} className="text-[11px] text-muted">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {comparison.missingFromDiagram.length === 0 && comparison.missingFromExcel.length === 0 ? (
              <span className="text-[11px] text-muted">Every module matches, both ways.</span>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
