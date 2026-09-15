"use client";

import { useTransition } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { openEntitlementPeriod, setEntitlementOverage } from "./blueprint-actions";
import type { EntitlementPeriodRow } from "@/lib/data/hypercare-blueprint";

export function EntitlementCard({ serviceId, serviceRef, period }: { serviceId: string; serviceRef: string; period: EntitlementPeriodRow | null }) {
  const [isPending, startTransition] = useTransition();

  if (!period) {
    return (
      <Card>
        <CardHeader title="Entitlement" note="NO PERIOD OPEN" />
        <div className="px-4 py-3.5 flex flex-col gap-2">
          <span className="text-[11.5px] text-muted leading-[1.55]">
            No entitlement period covers today. Open this month's, using the units from the service agreement.
          </span>
          <Button
            variant="primary"
            className="self-start"
            disabled={isPending}
            onClick={() => startTransition(() => openEntitlementPeriod(serviceId, serviceRef))}
          >
            {isPending ? "Opening..." : "Open this month"}
          </Button>
        </div>
      </Card>
    );
  }

  const pct = period.includedUnits > 0 ? Math.min(100, Math.round((period.consumedUnits / period.includedUnits) * 100)) : 0;
  const over = period.overageUnits > 0;

  return (
    <Card>
      <CardHeader title="Entitlement" note={`${period.periodStart} – ${period.periodEnd}`} />
      <div className="px-4 py-3.5 flex flex-col gap-2">
        <div className="flex items-baseline gap-2">
          <span className="font-display font-extrabold text-[22px] text-ink">
            {period.consumedUnits} / {period.includedUnits}
          </span>
          <span className="text-[11px] text-muted">units consumed this period</span>
        </div>
        <div className="h-1.5 rounded-[3px] bg-line overflow-hidden">
          <div className={`h-full ${over ? "bg-coral" : "bg-ink"}`} style={{ width: `${pct}%` }} />
        </div>
        {over ? (
          <div className="flex items-center gap-2">
            <span className="text-[11.5px] text-coral font-semibold">{period.overageUnits} units over — bill or absorb</span>
            {!period.overageBilled && !period.overageAbsorbed ? (
              <>
                <Button
                  variant="secondary"
                  disabled={isPending}
                  onClick={() => startTransition(() => setEntitlementOverage(period.id, serviceRef, "billed"))}
                >
                  Bill it
                </Button>
                <Button
                  variant="secondary"
                  disabled={isPending}
                  onClick={() => startTransition(() => setEntitlementOverage(period.id, serviceRef, "absorbed"))}
                >
                  Absorb it
                </Button>
              </>
            ) : (
              <span className="font-mono text-[9.5px] text-muted">{period.overageBilled ? "BILLED" : "ABSORBED"}</span>
            )}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
