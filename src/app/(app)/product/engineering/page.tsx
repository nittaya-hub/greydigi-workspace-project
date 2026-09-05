import Link from "next/link";
import { PageHeading, Card } from "@/components/ui/Card";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { getEngineeringLoad } from "@/lib/data/product";

const COLS = "120px 1fr 62px 62px 62px 66px";

function pct(n: number, max: number) {
  return max > 0 ? Math.round((n / max) * 100) : 0;
}

export default async function EngineeringPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const rows = workspaceId ? await getEngineeringLoad(workspaceId) : [];
  const maxTotal = Math.max(1, ...rows.map((r) => r.totalDays));

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px]">
      <PageHeading
        title="Engineering"
        description="One person can carry delivery tasks, product features and hypercare incidents at once. This is the only screen that shows all three together."
      />
      <Card>
        {rows.length === 0 ? (
          <div className="py-10 px-4 text-center text-[12.5px] text-muted">No open work assigned right now.</div>
        ) : (
          <>
            <div style={{ gridTemplateColumns: COLS }} className="grid gap-2.5 bg-[#FCFCFA] border-b border-line-soft px-4 py-2.5 font-mono text-[9px] tracking-[.08em] text-muted">
              <span>PERSON</span>
              <span>OPEN WORK</span>
              <span>DEL</span>
              <span>PROD</span>
              <span>HYP</span>
              <span>TOTAL</span>
            </div>
            {rows.map((r, i) => (
              <div
                key={r.personName}
                style={{ gridTemplateColumns: COLS }}
                className={`grid gap-2.5 items-center px-4 py-[11px] text-[12px] ${i < rows.length - 1 ? "border-b border-line-soft" : ""}`}
              >
                <Link href={`/people/${r.personId}`} className="text-[12.5px] font-semibold text-ink truncate hover:text-coral">
                  {r.personName}
                </Link>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-[7px] rounded-[4px] bg-line-soft overflow-hidden flex">
                    <span className="h-[7px] bg-coral" style={{ width: `${(r.deliveryDays / maxTotal) * 100}%` }} />
                    <span className="h-[7px] bg-ink" style={{ width: `${(r.productDays / maxTotal) * 100}%` }} />
                    <span className="h-[7px] bg-warn-fg" style={{ width: `${(r.hypercareDays / maxTotal) * 100}%` }} />
                  </div>
                  <span className="font-mono text-[9.5px] text-muted flex-none w-[30px] text-right">{pct(r.totalDays, maxTotal)}%</span>
                </div>
                <span className="font-mono text-[9.5px] text-muted">{r.deliveryDays}</span>
                <span className="font-mono text-[9.5px] text-muted">{r.productDays}</span>
                <span className="font-mono text-[9.5px] text-muted">{r.hypercareDays}</span>
                <span className="font-mono text-[9.5px] text-muted">{r.totalDays}</span>
              </div>
            ))}
          </>
        )}
      </Card>
      <Card className="p-4 flex flex-col gap-1.5">
        <span className="font-mono text-[9px] tracking-[.09em] text-muted">WHY THIS MATTERS</span>
        <span className="text-[11.5px] text-muted leading-[1.55]">
          Rebalancing needs the whole picture, which is why the three spaces share one person record instead of
          each keeping their own.
        </span>
      </Card>
    </div>
  );
}
