"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { recordCheckpointSourceFile } from "./actions";

/** PDF/PNG only, per the ask this backs -- a status deck like the dev
 * team's own SG schema build map. Real storage (delivery-documents,
 * same bucket Missions' Documents tab uses), not a placeholder: the
 * file lands in Storage and is queryable the moment this resolves.
 * "Run auto-map" on the resulting row is a separate, always-gated
 * action (runCheckpointAutoMap) -- this button only saves the file. */
export function UploadCheckpointSourceButton({ projectId, workspaceId, projectRef }: { projectId: string; workspaceId: string; projectRef: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/png"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setError(null);
          startTransition(async () => {
            try {
              const supabase = createBrowserClient();
              const path = `${workspaceId}/${projectId}/checkpoint-sources/${Date.now()}-${file.name}`;
              const { error: uploadError } = await supabase.storage.from("delivery-documents").upload(path, file);
              if (uploadError) throw new Error(uploadError.message);
              await recordCheckpointSourceFile(projectId, projectRef, {
                path,
                name: file.name,
                size: file.size,
                type: file.type,
              });
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not upload the file.");
            } finally {
              if (inputRef.current) inputRef.current.value = "";
            }
          });
        }}
      />
      <Button variant="secondary" type="button" disabled={isPending} onClick={() => inputRef.current?.click()} className="!h-7 !text-[11px]">
        {isPending ? "Uploading..." : "Upload a source document (PDF/PNG)"}
      </Button>
      {error ? <span className="text-[11px] text-block-fg">{error}</span> : null}
    </div>
  );
}
