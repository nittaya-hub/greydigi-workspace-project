"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { DownloadDocumentLink } from "../documents/DownloadDocumentLink";
import type { CheckpointSourceFileRow as CheckpointSourceFileRowType } from "@/lib/data/project";
import { runCheckpointAutoMap, deleteCheckpointSourceFile } from "./actions";

export function CheckpointSourceFileRow({
  file,
  projectId,
  projectRef,
  canEdit,
}: {
  file: CheckpointSourceFileRowType;
  projectId: string;
  projectRef: string;
  canEdit: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-1 px-3 py-2.5 border border-line-soft rounded-[9px]">
      <div className="flex items-center justify-between gap-3">
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
                className="!h-6 !px-2 !text-[10.5px]"
                onClick={() => {
                  setError(null);
                  setNotice(null);
                  startTransition(async () => {
                    const result = await runCheckpointAutoMap(file.id, projectId, projectRef);
                    if (!result.ok) setError(result.message);
                    else setNotice(result.message);
                  });
                }}
              >
                Run auto-map
              </Button>
              <form action={deleteCheckpointSourceFile.bind(null, file.id, projectId, projectRef)}>
                <Button variant="secondary" type="submit" className="!h-6 !px-2 !text-[10.5px]">
                  Delete
                </Button>
              </form>
            </>
          ) : null}
        </div>
      </div>
      {error ? <span className="text-[10.5px] text-block-fg leading-[1.4]">{error}</span> : null}
      {notice ? <span className="text-[10.5px] text-ok-fg leading-[1.4]">{notice}</span> : null}
    </div>
  );
}
