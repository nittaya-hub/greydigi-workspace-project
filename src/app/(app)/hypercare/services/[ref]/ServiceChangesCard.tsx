"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, EmptyState } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { Field, fieldInputClass } from "@/components/ui/Modal";
import { createServiceChange, completeServiceChange } from "./blueprint-actions";
import type { ServiceChangeRow } from "@/lib/data/hypercare-blueprint";

export function ServiceChangesCard({ serviceId, serviceRef, changes }: { serviceId: string; serviceRef: string; changes: ServiceChangeRow[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader title="Service changes" note={`${changes.filter((c) => c.status === "open").length} OPEN`} />
      <div className="px-4 py-3.5 flex flex-col gap-3">
        {changes.length === 0 ? (
          <EmptyState title="No service changes yet." description="A change inside entitlement or billable — above the effort threshold, raise a CR on the mission instead." />
        ) : (
          <div className="flex flex-col gap-2">
            {changes.map((c) => (
              <div key={c.id} className="flex items-start justify-between gap-2.5 py-2 border-b border-line-soft last:border-b-0">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[12px] font-semibold text-ink">{c.title}</span>
                  <span className="font-mono text-[9.5px] text-muted">
                    {c.effortBand ?? "—"} {c.billable ? "· BILLABLE" : "· IN ENTITLEMENT"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-none">
                  <Pill tone={c.status === "done" ? "done" : "in_progress"}>{c.status.toUpperCase()}</Pill>
                  {c.status === "open" ? (
                    <Button variant="secondary" disabled={isPending} onClick={() => startTransition(() => completeServiceChange(c.id, serviceRef))}>
                      Complete
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}

        {open ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              startTransition(async () => {
                await createServiceChange(serviceId, serviceRef, formData);
                setOpen(false);
              });
            }}
            className="flex flex-col gap-2.5 pt-2 border-t border-line-soft"
          >
            <Field label="TITLE">
              <input name="title" required autoFocus className={fieldInputClass} />
            </Field>
            <Field label="DESCRIPTION">
              <textarea name="description" rows={2} className={fieldInputClass} />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Field label="EFFORT BAND">
                <input name="effortBand" placeholder="1 hour" className={fieldInputClass} />
              </Field>
              <label className="flex items-center gap-1.5 text-[11px] text-muted sm:self-end sm:pb-2">
                <input type="checkbox" name="billable" /> Billable (past entitlement)
              </label>
            </div>
            <div className="flex gap-2">
              <Button variant="primary" type="submit" disabled={isPending}>
                {isPending ? "Adding..." : "Add change"}
              </Button>
              <Button variant="secondary" type="button" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="secondary" className="self-start" onClick={() => setOpen(true)}>
            Log a service change
          </Button>
        )}
      </div>
    </Card>
  );
}
