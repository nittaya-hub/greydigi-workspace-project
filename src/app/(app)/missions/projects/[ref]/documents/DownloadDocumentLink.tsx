"use client";

import { useState, useTransition } from "react";
import { getDocumentDownloadUrl } from "./actions";

export function DownloadDocumentLink({ storagePath }: { storagePath: string }) {
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
            const url = await getDocumentDownloadUrl(storagePath);
            window.open(url, "_blank", "noopener,noreferrer");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not create a download link.");
          }
        });
      }}
      className="font-mono text-[9.5px] tracking-[.05em] text-coral hover:underline justify-self-start disabled:opacity-50"
      title={error ?? undefined}
    >
      {isPending ? "..." : error ? "RETRY DOWNLOAD" : "DOWNLOAD"}
    </button>
  );
}
