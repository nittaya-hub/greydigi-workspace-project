"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, EmptyState } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { Field, fieldInputClass } from "@/components/ui/Modal";
import { createImprovementItem, resolveImprovementItem } from "./blueprint-actions";
import type { ImprovementItemRow } from "@/lib/data/hypercare-blueprint";

export function ImprovementItemsCard({ serviceId, serviceRef, items }: { serviceId: string; serviceRef: string; items: ImprovementItemRow[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader title="Improvement items" note="FEEDS MANIFEST + HANGAR ROADMAP" />
      <div className="px-4 py-3.5 flex flex-col gap-3">
        {items.length === 0 ? (
          <EmptyState title="Nothing logged yet." description="A recurring pattern worth fixing — the most honest feedback the platform gets about what it builds badly." />
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((i) => (
              <div key={i.id} className="flex items-start justify-between gap-2.5 py-2 border-b border-line-soft last:border-b-0">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[12px] font-semibold text-ink">{i.pattern}</span>
                  {i.proposedFix ? <span className="text-[11px] text-muted">{i.proposedFix}</span> : null}
                  <span className="font-mono text-[9.5px] text-muted">SEEN {i.frequency}×</span>
                </div>
                <div className="flex items-center gap-1.5 flex-none">
                  <Pill tone={i.status === "done" ? "done" : "watch"}>{i.status.toUpperCase()}</Pill>
                  {i.status === "open" ? (
                    <Button variant="secondary" disabled={isPending} onClick={() => startTransition(() => resolveImprovementItem(i.id, serviceRef))}>
                      Resolve
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
                await createImprovementItem(serviceId, serviceRef, formData);
                setOpen(false);
              });
            }}
            className="flex flex-col gap-2.5 pt-2 border-t border-line-soft"
          >
            <Field label="PATTERN">
              <input name="pattern" required autoFocus className={fieldInputClass} placeholder="Clients keep asking to re-run the same export" />
            </Field>
            <Field label="PROPOSED FIX">
              <textarea name="proposedFix" rows={2} className={fieldInputClass} />
            </Field>
            <Field label="TIMES SEEN">
              <input name="frequency" type="number" defaultValue={1} className={fieldInputClass} />
            </Field>
            <div className="flex gap-2">
              <Button variant="primary" type="submit" disabled={isPending}>
                {isPending ? "Logging..." : "Log item"}
              </Button>
              <Button variant="secondary" type="button" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="secondary" className="self-start" onClick={() => setOpen(true)}>
            Log an improvement item
          </Button>
        )}
      </div>
    </Card>
  );
}
