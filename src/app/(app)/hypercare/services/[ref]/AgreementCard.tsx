"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, fieldInputClass } from "@/components/ui/Modal";
import { upsertServiceAgreement } from "./blueprint-actions";
import type { ServiceAgreementRow } from "@/lib/data/hypercare-blueprint";

export function AgreementCard({ serviceId, serviceRef, agreement }: { serviceId: string; serviceRef: string; agreement: ServiceAgreementRow | null }) {
  const [editing, setEditing] = useState(!agreement);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader title="Service agreement" note={agreement ? agreement.tier.toUpperCase() : "NOT SET"} />
      <div className="px-4 py-3.5">
        {editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              const formData = new FormData(e.currentTarget);
              startTransition(async () => {
                try {
                  await upsertServiceAgreement(serviceId, serviceRef, formData);
                  setEditing(false);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not save.");
                }
              });
            }}
            className="flex flex-col gap-2.5"
          >
            <div className="grid sm:grid-cols-2 gap-2.5">
              <Field label="TIER">
                <input name="tier" required defaultValue={agreement?.tier ?? ""} className={fieldInputClass} placeholder="Standard" />
              </Field>
              <Field label="TERM (MONTHS)">
                <input name="termMonths" type="number" defaultValue={agreement?.termMonths ?? ""} className={fieldInputClass} />
              </Field>
              <Field label="FEE">
                <input name="fee" defaultValue={agreement?.fee ?? ""} className={fieldInputClass} placeholder="SGD 4,000 / month" />
              </Field>
              <Field label="ENTITLEMENT (UNITS INCLUDED / PERIOD)">
                <input name="entitlementIncludedUnits" type="number" defaultValue={agreement?.entitlementIncludedUnits ?? 0} className={fieldInputClass} />
              </Field>
              <Field label="RENEWAL DATE">
                <input name="renewalDate" type="date" defaultValue={agreement?.renewalDate ?? ""} className={fieldInputClass} />
              </Field>
              <Field label="SOURCE (E.G. SIGNED SOW REF)">
                <input name="sourceRef" defaultValue={agreement?.sourceRef ?? ""} className={fieldInputClass} />
              </Field>
            </div>
            {error ? <p className="text-[11.5px] text-block-fg">{error}</p> : null}
            <div className="flex gap-2">
              <Button variant="primary" type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save agreement"}
              </Button>
              {agreement ? (
                <Button variant="secondary" type="button" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        ) : agreement ? (
          <div className="flex flex-col gap-1.5">
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px]">
              <span className="text-muted">Term</span>
              <span className="text-ink font-semibold">{agreement.termMonths ? `${agreement.termMonths} months` : "—"}</span>
              <span className="text-muted">Fee</span>
              <span className="text-ink font-semibold">{agreement.fee ?? "—"}</span>
              <span className="text-muted">Entitlement</span>
              <span className="text-ink font-semibold">{agreement.entitlementIncludedUnits} units / period</span>
              <span className="text-muted">Renewal</span>
              <span className="text-ink font-semibold">{agreement.renewalDate ?? "—"}</span>
            </div>
            <Button variant="secondary" className="self-start mt-1" onClick={() => setEditing(true)}>
              Edit
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
