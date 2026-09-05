import { PageHeading, Card, CardHeader } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { getCrossSpaceDashboard } from "@/lib/data/dashboard";
import { ExportButton } from "./ExportButton";

export default async function CrossSpaceDashboardPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const data = workspaceId
    ? await getCrossSpaceDashboard(workspaceId)
    : { deliveryInFlight: 0, goLive30d: 0, servicesLive: 0, openIncidents: 0, atRiskCount: 0, handoverQueue: [], hypercareToChangeRequest: 0, hypercareToProductFeature: 0 };

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px]">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <PageHeading title="Where work crosses spaces" description="Every arrow is an explicit, audited relationship between records. None of these numbers are inferred." />
        <ExportButton data={data} />
      </div>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_60px_1fr_60px_1fr] items-center p-5 gap-4 sm:gap-0">
          <div className="flex flex-col gap-2 p-4 border border-line rounded-[12px] bg-white">
            <span className="font-mono text-[9px] text-coral">SPACE 01 DELIVERY</span>
            <span className="font-display font-extrabold text-[26px]">{data.deliveryInFlight}</span>
            <span className="text-[11.5px] text-muted">projects in flight, {data.handoverQueue.length} at G5 awaiting handover</span>
          </div>
          <div className="hidden sm:flex flex-col items-center gap-1">
            <span className="font-mono text-[8.5px] text-muted">G5 CLEARS</span>
            <span className="text-[16px]">→</span>
            <span className="font-mono text-[8.5px] text-muted">{data.handoverQueue.length} PENDING</span>
          </div>
          <div className="flex flex-col gap-2 p-4 border border-ink rounded-[12px] bg-ink text-[#EDEEF1]">
            <span className="font-mono text-[9px] text-muted-2">GO LIVE, 30 DAYS</span>
            <span className="font-display font-extrabold text-[26px]">{data.goLive30d}</span>
            <span className="text-[11.5px] text-muted-2">services opened in the last 30 days</span>
          </div>
          <div className="hidden sm:flex flex-col items-center gap-1">
            <span className="font-mono text-[8.5px] text-muted">SERVICE OPENED</span>
            <span className="text-[16px]">→</span>
            <span className="font-mono text-[8.5px] text-muted">WITH SLA</span>
          </div>
          <div className="flex flex-col gap-2 p-4 border border-line rounded-[12px] bg-white">
            <span className="font-mono text-[9px] text-muted">SPACE 03 HYPERCARE</span>
            <span className="font-display font-extrabold text-[26px]">{data.servicesLive}</span>
            <span className="text-[11.5px] text-muted">
              services live, {data.openIncidents} open incidents, {data.atRiskCount} at breach risk
            </span>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 border-t border-line-soft">
          <div className="p-4 sm:border-r border-line-soft flex flex-col gap-1.5">
            <span className="font-mono text-[9px] text-muted">HYPERCARE → CHANGE REQUEST</span>
            <span className="font-display font-extrabold text-[20px]">{data.hypercareToChangeRequest}</span>
            <span className="text-[11.5px] text-muted">Repeat incidents became scope on a live project.</span>
          </div>
          <div className="p-4 sm:border-r border-line-soft flex flex-col gap-1.5">
            <span className="font-mono text-[9px] text-muted">HYPERCARE → PRODUCT FEATURE</span>
            <span className="font-display font-extrabold text-[20px]">{data.hypercareToProductFeature}</span>
            <span className="text-[11.5px] text-muted">Repeat patterns entered the roadmap.</span>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Handover queue" note="G5 CLEARED, SERVICE NOT OPENED" />
        {data.handoverQueue.length === 0 ? (
          <div className="py-8 px-4 text-center text-[11.5px] text-muted">Nothing waiting on handover.</div>
        ) : (
          data.handoverQueue.map((p) => (
            <div key={p.ref} className="flex items-center gap-2.5 px-4 py-[11px] border-b border-line-soft last:border-b-0 text-[12px]">
              <span className="flex-1">
                <span className="text-[12.5px] font-semibold text-ink">{p.ref} {p.name}</span>
                <br />
                <span className="font-mono text-[9.5px] text-muted">CLEARED{p.clearedAt ? ` ${p.clearedAt.slice(0, 10)}` : ""}</span>
              </span>
              <LinkButton href={`/delivery/projects/${p.ref.toLowerCase()}`} variant="coral">
                Open service
              </LinkButton>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
