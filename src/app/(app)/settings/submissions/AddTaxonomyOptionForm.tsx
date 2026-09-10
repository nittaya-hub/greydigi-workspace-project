"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/shadcn/input";
import { Button } from "@/components/shadcn/button";
import type { ClientSubmissionKind } from "@/lib/supabase/database.types";
import type { SubmissionTaxonomyField } from "@/lib/data/submission-taxonomies";
import { addSubmissionTaxonomyOption } from "../actions";

export function AddTaxonomyOptionForm({
  workspaceId,
  kind,
  field,
}: {
  workspaceId: string;
  kind: ClientSubmissionKind;
  field: SubmissionTaxonomyField;
}) {
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="grid grid-cols-[1fr_auto] items-center gap-2.5 px-4 py-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          try {
            await addSubmissionTaxonomyOption(workspaceId, { kind, field, value: label, label });
            setLabel("");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not add option.");
          }
        });
      }}
    >
      <Input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="New option label"
        className="text-[11.5px]"
        disabled={isPending}
      />
      <Button type="submit" variant="secondary" size="sm" disabled={isPending || !label.trim()}>
        {isPending ? "Adding..." : "Add"}
      </Button>
      {error ? <span className="col-span-2 text-[11px] text-block-fg">{error}</span> : null}
    </form>
  );
}
