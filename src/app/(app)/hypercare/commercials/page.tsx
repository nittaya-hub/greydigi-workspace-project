import Link from "next/link";
import { PageHeading, Card, CardHeader, EmptyState } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { TableHead, TableRow, CellStack } from "@/components/ui/Table";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { getSelectedClientId } from "@/lib/data/client-scope";
import { getCommercialsOverview } from "@/lib/data/hypercare-blueprint";

const COLS = "1fr 130px 130px 130px";

function money(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/** Hypercare's fourth screen (Overview, Service detail, Queue,
 * Commercials — blueprint page 3). Internal-only by design: this is the
 * exact figure the client-facing report and portal never show ("Internal
 * effort and rates... never crosses the publication boundary"). Numbers
 * are entered by hand on each service's own Agreement card — this page
 * is a read-only roll-up across every service, not its own edit surface. */
export default async function CommercialsPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const clientId = await getSelectedClientId();
  const rows = workspaceId ? await getCommercialsOverview(workspaceId, clientId) : [];

  const entered = rows.filter((r) => r.marginMonthly != null);
  const totalFee = entered.reduce((sum, r) => sum + (r.feeAmountMonthly ?? 0), 0);
  const totalCost = entered.reduce((sum, r) => sum + (r.monthlyRunningCost ?? 0), 0);
  const totalMargin = totalFee - totalCost;

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1200px] mx-auto">
      <PageHeading
        title="Commercials"
        description="Fee, running cost and margin per service — hand-entered on each service's own Agreement card, never sent to a client. No service here has gone live into Hypercare with real numbers yet, so most rows read as not entered."
      />

      {rows.length === 0 ? (
        <EmptyState title="No services yet." description="Commercials has nothing to show until a mission reaches Gate 5 and opens a service." />
      ) : (
        <>
          <Card>
            <CardHeader
              title="Across every service shown"
              note={`${entered.length} OF ${rows.length} HAVE BOTH NUMBERS ENTERED`}
            />
            <div className="px-4 py-3.5 grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-[9px] tracking-[.07em] text-muted">FEE / MONTH</span>
                <span className="font-display font-extrabold text-[18px] text-ink">{money(entered.length ? totalFee : null)}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-[9px] tracking-[.07em] text-muted">RUNNING COST / MONTH</span>
                <span className="font-display font-extrabold text-[18px] text-ink">{money(entered.length ? totalCost : null)}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-[9px] tracking-[.07em] text-muted">MARGIN / MONTH</span>
                <span className={`font-display font-extrabold text-[18px] ${entered.length && totalMargin < 0 ? "text-coral" : "text-ink"}`}>
                  {money(entered.length ? totalMargin : null)}
                </span>
              </div>
            </div>
          </Card>

          <Card>
            <TableHead cols={COLS}>
              <span>SERVICE</span>
              <span>FEE / MONTH</span>
              <span>COST / MONTH</span>
              <span>MARGIN</span>
            </TableHead>
            {rows.map((r, i) => (
              <TableRow cols={COLS} key={r.serviceId} last={i === rows.length - 1}>
                <Link href={`/hypercare/services/${r.serviceRef.toLowerCase()}`} className="min-w-0">
                  <CellStack primary={r.serviceName} secondary={`${r.clientName.toUpperCase()} · ${r.tier ? r.tier.toUpperCase() : "NO TIER SET"}`} />
                </Link>
                <span className="font-mono text-[11px] text-ink">{money(r.feeAmountMonthly)}</span>
                <span className="font-mono text-[11px] text-ink">{money(r.monthlyRunningCost)}</span>
                {r.marginMonthly != null ? (
                  <Pill tone={r.marginMonthly < 0 ? "blocked" : "done"} className="justify-self-start">
                    {money(r.marginMonthly)}
                  </Pill>
                ) : (
                  <span className="font-mono text-[10px] text-muted italic">Not entered yet</span>
                )}
              </TableRow>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
