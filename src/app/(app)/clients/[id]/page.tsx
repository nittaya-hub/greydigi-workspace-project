import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardHeader, StatTile } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { FlightPlanSpine } from "@/components/portal/FlightPlanSpine";
import { getClientById } from "@/lib/data/clients";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { PortalAccessButton } from "./PortalAccessButton";
import { NewProjectButton } from "./NewProjectButton";
import { HypercareEnabledToggle } from "./HypercareEnabledToggle";
import { listTemplateVersionOptions, listInternalPeopleOptions } from "./data";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getClientById(id);
  if (!client) notFound();

  const workspaceId = await getCurrentWorkspaceId();
  const [templateVersions, leadOptions] = workspaceId
    ? await Promise.all([listTemplateVersionOptions(workspaceId), listInternalPeopleOptions(workspaceId)])
    : [[], []];

  const heldProjects = client.projects.filter((p) => p.heldGateCode);
  const openIncidentServices = client.services.filter((s) => s.openIncidents > 0);

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-5 max-w-[1000px]">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="w-[34px] h-[3px] bg-coral rounded-[2px]" />
          {client.clientSince ? <span className="font-mono text-[9.5px] text-muted">CLIENT SINCE {client.clientSince}</span> : null}
          <h1 className="m-0 font-display font-extrabold text-[20px] text-ink">{client.name}</h1>
        </div>
        <div className="flex items-center gap-4 flex-none">
          <HypercareEnabledToggle clientId={client.id} initialEnabled={client.hypercareEnabled} />
          <div className="flex gap-1.5">
            <PortalAccessButton clientId={client.id} />
            <NewProjectButton clientId={client.id} templateVersions={templateVersions} leadOptions={leadOptions} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatTile
          label="DELIVERY"
          value={client.projects.length}
          note={heldProjects[0] ? `${heldProjects[0].ref}, held at ${heldProjects[0].heldGateCode}` : undefined}
        />
        <StatTile
          label="HYPERCARE"
          value={client.services.length}
          note={openIncidentServices[0] ? `${openIncidentServices[0].ref}, ${openIncidentServices[0].openIncidents} open` : undefined}
        />
        <StatTile label="PORTAL ACCESS" value={client.people.filter((p) => p.hasPortalAccess).length} note={`Of ${client.people.length} people`} />
      </div>

      <Card>
        <CardHeader title="People" note="ONE IDENTITY, ROLE SCOPED" />
        {client.people.length === 0 ? (
          <div className="py-8 px-4 text-center text-[11.5px] text-muted">No people linked yet.</div>
        ) : (
          client.people.map((p, i) => (
            <div key={i} className={`grid grid-cols-[1fr_116px_108px] gap-2.5 items-center px-4 py-[11px] text-[12px] ${i < client.people.length - 1 ? "border-b border-line-soft" : ""}`}>
              <span className="text-[12.5px] font-semibold text-ink">{p.fullName}</span>
              <span className="text-muted capitalize">{p.role}</span>
              <Pill tone={p.hasPortalAccess ? "done" : "watch"} className="justify-self-start">
                {p.hasPortalAccess ? "PORTAL ACTIVE" : "INVITED"}
              </Pill>
            </div>
          ))
        )}
      </Card>

      <Card>
        <CardHeader title="Across the spaces" note="NO DUPLICATED RECORDS" />
        {client.projects.length === 0 && client.services.length === 0 && client.releaseDependencies.length === 0 ? (
          <div className="py-8 px-4 text-center text-[11.5px] text-muted">Nothing yet.</div>
        ) : (
          <div className="flex flex-col">
            {client.projects.map((p) => (
              <div key={p.ref} className="flex gap-2.5 items-center px-4 py-[11px] border-b border-line-soft text-[12px]">
                <Pill tone="waiting_on_client">DELIVERY</Pill>
                <Link href={`/delivery/projects/${p.ref.toLowerCase()}`} className="flex-1 flex flex-col gap-0.5">
                  <span className="text-[12.5px] font-semibold text-ink">{p.name}</span>
                  <span className="font-mono text-[9.5px] text-muted">
                    PHASE {p.phaseCode ?? "—"}
                    {p.heldGateCode ? `, GATE ${p.heldGateCode} HELD` : ""}
                  </span>
                </Link>
              </div>
            ))}
            {client.services.map((s) => (
              <div key={s.ref} className="flex gap-2.5 items-center px-4 py-[11px] border-b border-line-soft last:border-b-0 text-[12px]">
                <Pill tone="blocked">HYPERCARE</Pill>
                <Link href={`/hypercare/services/${s.ref.toLowerCase()}`} className="flex-1 flex flex-col gap-0.5">
                  <span className="text-[12.5px] font-semibold text-ink">{s.name}</span>
                  <span className="font-mono text-[9.5px] text-muted">{s.ref}{s.openIncidents > 0 ? `, ${s.openIncidents} OPEN` : ""}</span>
                </Link>
              </div>
            ))}
            {client.releaseDependencies.map((d, i) => (
              <div key={`${d.projectRef}-${d.releaseCode}-${i}`} className="flex gap-2.5 items-center px-4 py-[11px] border-b border-line-soft last:border-b-0 text-[12px]">
                <Pill tone="dark">PRODUCT</Pill>
                <Link href={`/product/releases/${d.releaseCode.toLowerCase()}`} className="flex-1 flex flex-col gap-0.5">
                  <span className="text-[12.5px] font-semibold text-ink">{d.productName} — {d.releaseName}</span>
                  <span className="font-mono text-[9.5px] text-muted">
                    {d.releaseCode.toUpperCase()}, {d.status.replace(/_/g, " ").toUpperCase()}, waited on by {d.projectRef}
                  </span>
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>

      {client.projects.some((p) => p.phases.length > 0) ? (
        <Card>
          <CardHeader title="Flight plans" note="WHERE EACH PROJECT IS" />
          <div className="flex flex-col">
            {client.projects
              .filter((p) => p.phases.length > 0)
              .map((p, i, arr) => (
                <div key={p.ref} className={`flex flex-col gap-2.5 px-4 py-3.5 ${i < arr.length - 1 ? "border-b border-line-soft" : ""}`}>
                  <Link href={`/delivery/projects/${p.ref.toLowerCase()}`} className="text-[12.5px] font-semibold text-ink">
                    {p.name}
                  </Link>
                  <FlightPlanSpine phases={p.phases} gates={p.gates} dark={false} />
                </div>
              ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
