"use client";

import { useRef, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { UploadProgressBar } from "@/components/ui/UploadProgressBar";
import { useToast } from "@/components/ui/Toast";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { useStagedProgress } from "@/lib/useStagedProgress";
import { withTimeout } from "@/lib/withTimeout";
import { recordArchitectureSourceFile, importArchitectureExcel } from "./actions";

/** Mirrors UploadCheckpointSourceButton's own upload flow (browser ->
 * delivery-documents Storage -> a Server Action that records the row),
 * then immediately runs the deterministic Excel-to-diagram import --
 * no AI needed here, since a spreadsheet is already structured data.
 * Capped at 20s total (withTimeout) with a staged progress bar, since
 * the Supabase storage client has no real byte-progress callback and
 * the import itself is several sequential inserts, not one call. */
export function UploadArchitectureExcelButton({ projectId, workspaceId, projectRef }: { projectId: string; workspaceId: string; projectRef: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const toast = useToast();
  const { percent, stage, reset } = useStagedProgress();

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          reset();
          startTransition(async () => {
            try {
              await withTimeout(
                (async () => {
                  const supabase = createBrowserClient();
                  const path = `${workspaceId}/${projectId}/architecture-sources/${Date.now()}-${file.name}`;
                  const { error: uploadError } = await stage(supabase.storage.from("delivery-documents").upload(path, file), 35);
                  if (uploadError) throw new Error(uploadError.message);
                  const { id } = await stage(
                    recordArchitectureSourceFile(projectId, projectRef, { path, name: file.name, size: file.size, type: file.type }),
                    50
                  );
                  const result = await stage(importArchitectureExcel(projectId, projectRef, id), 100);
                  toast.show(result.message, result.ok ? "success" : "error");
                })(),
                20_000
              );
            } catch (err) {
              toast.show(err instanceof Error ? err.message : "Could not upload the file.", "error");
            } finally {
              if (inputRef.current) inputRef.current.value = "";
            }
          });
        }}
      />
      <Button variant="secondary" type="button" disabled={isPending} onClick={() => inputRef.current?.click()}>
        {isPending ? "Importing..." : "Upload Excel & map"}
      </Button>
      {isPending ? (
        <UploadProgressBar percent={percent} label={percent < 35 ? "Uploading..." : percent < 50 ? "Saving..." : "Mapping data..."} />
      ) : null}
    </div>
  );
}
