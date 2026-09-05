import { notFound } from "next/navigation";
import { Card, StatTile } from "@/components/ui/Card";
import { getServiceByRef } from "@/lib/data/hypercare";
import { LogIncidentButton } from "../../incidents/LogIncidentButton";

export default async function ServiceDetailPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const service = await getServiceByRef(ref);
  if (!service) notFound();

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-5 max-w-[900px]">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="w-[34px] h-[3px] bg-coral rounded-[2px]" />
          <span className="font-mono text-[9.5px] text-muted">
            {service.ref} · {service.clientName}
            {service.liveSince ? ` · LIVE SINCE ${service.liveSince}` : ""}
          </span>
          <h1 className="m-0 font-display font-extrabold text-[20px] text-ink">{service.name}</h1>
        </div>
        <LogIncidentButton services={[]} lockedService={{ id: service.id, ref: service.ref, name: service.name }} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatTile label="SLA POLICY" value={service.slaPolicy?.name ?? "—"} note={service.slaPolicy ? `Resolve target ${Math.round(service.slaPolicy.resolveMinutes / 60)}h` : undefined} />
        <StatTile label="OPEN" value={service.openIncidents} accent={service.openIncidents > 0} />
        <StatTile label="HEALTH" value={service.health.replace("_", " ")} accent={service.health !== "healthy"} />
      </div>

      <Card className="p-4 flex flex-col gap-1.5">
        <span className="font-mono text-[9px] tracking-[.09em] text-muted">ABOUT THIS SERVICE</span>
        <span className="text-[12px] text-muted leading-[1.55]">
          Detailed runbook content (what this service runs, cross-space origin links) is next to wire — the SLA,
          health and open-incident numbers above are already live.
        </span>
      </Card>
    </div>
  );
}
