"use client";

import { useRef, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { recordArchitectureSourceFile, importArchitectureExcel } from "./actions";

/** Mirrors UploadCheckpointSourceButton's own upload flow (browser ->
 * delivery-documents Storage -> a Server Action that records the row),
 * then immediately runs the deterministic Excel-to-diagram import --
 * no AI needed here, since a spreadsheet is already structured data. */
export function UploadArchitectureExcelButton({ projectId, workspaceId, projectRef }: { projectId: string; workspaceId: string; projectRef: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

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
          startTransition(async () => {
            try {
              const supabase = createBrowserClient();
              const path = `${workspaceId}/${projectId}/architecture-sources/${Date.now()}-${file.name}`;
              const { error: uploadError } = await supabase.storage.from("delivery-documents").upload(path, file);
              if (uploadError) throw new Error(uploadError.message);
              const { id } = await recordArchitectureSourceFile(projectId, projectRef, {
                path,
                name: file.name,
                size: file.size,
                type: file.type,
              });
              const result = await importArchitectureExcel(projectId, projectRef, id);
              toast.show(result.message, result.ok ? "success" : "error");
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
    </div>
  );
}
