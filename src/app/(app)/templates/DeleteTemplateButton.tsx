"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { deleteTemplateVersion } from "./actions";

/** Super-admin-only delete for a template version — refused server-side
 * (see deleteTemplateVersion) when any project still uses it, so this is
 * only ever destructive to drafts and unused versions like a stray test
 * template, never to something a live engagement depends on. */
export function DeleteTemplateButton({ versionId, name, version, usedByCount }: { versionId: string; name: string; version: string; usedByCount: number }) {
  const router = useRouter();

  return (
    <ConfirmButton
      trigger={<Trash2 size={13} />}
      triggerClassName="flex-none w-7 h-7 flex items-center justify-center rounded-[7px] text-muted-2 hover:bg-block-bg hover:text-block-fg justify-self-end"
      title="Delete template"
      message={
        usedByCount > 0 ? (
          <>
            <strong>{usedByCount}</strong> project{usedByCount === 1 ? "" : "s"} still use {name} {version.toUpperCase()} — it cannot be deleted while
            that stays true.
          </>
        ) : (
          <>
            Delete {name} {version.toUpperCase()} permanently, along with its phases, gates and conditions. No project uses this version, so nothing in
            flight is affected. This cannot be undone.
          </>
        )
      }
      confirmLabel={usedByCount > 0 ? "Close" : "Delete"}
      onConfirm={async () => {
        if (usedByCount > 0) return;
        await deleteTemplateVersion(versionId);
        router.refresh();
      }}
    />
  );
}
