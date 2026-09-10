import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, StatTile } from "@/components/ui/Card";
import { getServiceByRef } from "@/lib/data/hypercare";
import { LogIncidentButton } from "../../incidents/LogIncidentButton";

const SEVERITY_LABEL: Record<string, string> = { sev1: "P1", sev2: "P2", sev3: "P3" };

function fmtMinutes(minutes: number): string {
  if (minutes % 1440 === 0) return `${minutes / 1440} business day${minutes === 1440 ? "" : "s"}`;
  if (minutes % 60 === 0) return `${minutes / 60}h`;
  return `${minutes}min`;
}

export default async function ServiceDetailPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const service = await getServiceByRef(ref);
  if (!service) notFound();

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-5 max-w-[900px] mx-auto">
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
        {service.originProject ? (
          <>
            <span className="text-[12px] text-ink leading-[1.55]">{service.originProject.description ?? "No description recorded on the delivery project."}</span>
            <Link
              href={`/delivery/projects/${service.originProject.ref.toLowerCase()}`}
              className="font-mono text-[9.5px] text-coral hover:underline self-start mt-1"
            >
              ORIGIN PROJECT: {service.originProject.ref} — {service.originProject.name}
            </Link>
          </>
        ) : (
          <span className="text-[12px] text-muted leading-[1.55]">
            No origin delivery project on record for this service — created directly in Hypercare rather than
            earned at G5 from a project.
          </span>
        )}
      </Card>

      {service.slaTiers.length > 0 ? (
        <Card>
          <div className="px-4 py-3.5 border-b border-line font-display font-extrabold text-[13.5px]">
            SLA targets by priority
          </div>
          <div className="grid grid-cols-3 gap-2.5 px-4 py-2.5 bg-[#FCFCFA] border-b border-line-soft font-mono text-[9px] tracking-[.08em] text-muted">
            <span>PRIORITY</span>
            <span>FIRST RESPONSE</span>
            <span>UPDATE CADENCE</span>
          </div>
          {service.slaTiers.map((t, i) => (
            <div
              key={t.severity}
              className={`grid grid-cols-3 gap-2.5 px-4 py-2.5 text-[12px] ${i < service.slaTiers.length - 1 ? "border-b border-line-soft" : ""}`}
            >
              <span className="font-mono text-[9.5px] text-ink">{SEVERITY_LABEL[t.severity] ?? t.severity.toUpperCase()}</span>
              <span className="text-ink">{fmtMinutes(t.responseMinutes)}</span>
              <span className="text-muted">{t.updateCadenceMinutes ? fmtMinutes(t.updateCadenceMinutes) : "On progress"}</span>
            </div>
          ))}
          <div className="px-4 py-2.5 border-t border-line-soft font-mono text-[9px] text-muted-2">
            SERVICE TARGETS, NOT GUARANTEED SERVICE LEVELS — NO CREDITS OR LIQUIDATED DAMAGES ATTACH TO THEM.
          </div>
        </Card>
      ) : null}
    </div>
  );
}
