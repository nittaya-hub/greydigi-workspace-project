import { PageHeading, Card, CardHeader, StatTile } from "@/components/ui/Card";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { getSelectedClientId } from "@/lib/data/client-scope";
import { getSlaData } from "@/lib/data/hypercare";

export default async function SlaPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const clientId = await getSelectedClientId();
  const sla = workspaceId ? await getSlaData(workspaceId, clientId) : { policies: [], metPct: null, servicePerformance: [] };

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px]">
      <PageHeading
        title="SLA"
        description="Met means resolved within the policy target, business hours only, paused time excluded. Every pause needs a reason."
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatTile label="MET, ALL TIME" value={sla.metPct != null ? `${sla.metPct}%` : "—"} note="Resolved incidents" />
        <StatTile label="POLICIES" value={sla.policies.length} />
        <StatTile label="SERVICES TRACKED" value={sla.servicePerformance.length} />
      </div>

      <Card>
        <CardHeader title="Policies" />
        {sla.policies.length === 0 ? (
          <div className="py-10 px-4 text-center text-[12.5px] text-muted">No SLA policies configured.</div>
        ) : (
          <div className="grid grid-cols-[1fr_74px_74px_70px] gap-2.5 px-4 py-2.5 bg-[#FCFCFA] border-b border-line-soft font-mono text-[9px] tracking-[.08em] text-muted">
            <span>POLICY</span>
            <span>RESPONSE</span>
            <span>RESOLVE</span>
            <span>SERVICES</span>
          </div>
        )}
        {sla.policies.map((p, i) => (
          <div
            key={p.name}
            className={`grid grid-cols-[1fr_74px_74px_70px] gap-2.5 items-center px-4 py-[11px] text-[12px] ${i < sla.policies.length - 1 ? "border-b border-line-soft" : ""}`}
          >
            <span className="text-[12.5px] font-semibold text-ink">{p.name}</span>
            <span className="font-mono text-[9.5px] text-muted">{Math.round(p.responseMinutes / 60)}h</span>
            <span className="font-mono text-[9.5px] text-muted">{Math.round(p.resolveMinutes / 60)}h</span>
            <span className="font-mono text-[9.5px] text-muted">{p.serviceCount}</span>
          </div>
        ))}
      </Card>

      {sla.servicePerformance.length > 0 ? (
        <Card>
          <CardHeader title="Performance by service" />
          <div className="px-4 py-3.5 flex flex-col gap-2.5">
            {sla.servicePerformance.map((s) => (
              <div key={s.name} className="flex items-center gap-2.5">
                <span className="text-[11.5px] w-[140px] text-muted truncate">{s.name}</span>
                <div className="flex-1 h-1.5 rounded-[3px] bg-line-soft overflow-hidden">
                  <span
                    className={`block h-1.5 ${s.metPct >= 95 ? "bg-ink" : "bg-warn-fg"}`}
                    style={{ width: `${s.metPct}%` }}
                  />
                </div>
                <span className="font-mono text-[9.5px] text-muted w-10 text-right">{s.metPct}%</span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
