"use client";

import { useState, useTransition } from "react";
import { getSubmissionAttachmentUrl } from "./actions";

function formatBytes(bytes: number | null): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DownloadAttachmentLink({ filePath, fileName, fileSize }: { filePath: string; fileName: string; fileSize: number | null }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        setError(null);
        startTransition(async () => {
          try {
            const url = await getSubmissionAttachmentUrl(filePath);
            window.open(url, "_blank", "noopener,noreferrer");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not create a download link.");
          }
        });
      }}
      className="flex items-center justify-between gap-3 w-full border border-line rounded-[8px] px-3 py-2 text-left hover:border-coral/40 hover:bg-coral-tint/30 disabled:opacity-60"
      title={error ?? undefined}
    >
      <span className="text-[12px] text-ink truncate">{fileName}</span>
      <span className="font-mono text-[9.5px] text-coral flex-none">
        {isPending ? "..." : error ? "RETRY" : ["DOWNLOAD", formatBytes(fileSize)].filter(Boolean).join(" · ")}
      </span>
    </button>
  );
}
