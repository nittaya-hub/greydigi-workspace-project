"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { duplicateTemplateVersion } from "./actions";

export function DuplicateButton({ versionId }: { versionId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex flex-col items-end gap-1 flex-none">
      <Button
        variant="secondary"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              const newVersionId = await duplicateTemplateVersion(versionId);
              router.push(`/templates/${newVersionId}`);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not duplicate this template.");
            }
          });
        }}
      >
        {isPending ? "Duplicating..." : "Duplicate"}
      </Button>
      {error ? <p className="text-[11px] text-block-fg">{error}</p> : null}
    </div>
  );
}
