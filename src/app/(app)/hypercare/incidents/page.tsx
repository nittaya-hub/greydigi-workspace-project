import Link from "next/link";
import { PageHeading, Card, EmptyState } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { TableHead, TableRow, CellStack } from "@/components/ui/Table";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { getSelectedClientId } from "@/lib/data/client-scope";
import { listIncidents, formatDuration, minutesUntil, listServices } from "@/lib/data/hypercare";
import { LogIncidentButton } from "./LogIncidentButton";

const COLS = "60px 1fr 70px 90px";
const SEV_TONE: Record<string, "blocked" | "in_progress" | "idle"> = { sev1: "blocked", sev2: "in_progress", sev3: "idle" };

export default async function IncidentsListPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const clientId = await getSelectedClientId();
  const incidents = workspaceId ? await listIncidents(workspaceId, clientId) : [];
  const services = workspaceId ? await listServices(workspaceId, clientId) : [];
  const open = incidents.filter((i) => i.status !== "resolved");
  const resolved = incidents.filter((i) => i.status === "resolved");

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <PageHeading title="Incidents" description="Default sort is time to breach. Severity comes from the SLA policy, not from whoever logged it." />
        <LogIncidentButton services={services.map((s) => ({ id: s.id, ref: s.ref, name: s.name }))} />
      </div>

      <div className="flex gap-1.5 flex-wrap">
        <span className="font-mono text-[9px] tracking-[.06em] rounded-[5px] px-[7px] py-[3px] bg-ink text-white">OPEN {open.length}</span>
        <span className="font-mono text-[9px] tracking-[.06em] rounded-[5px] px-[7px] py-[3px] border border-line text-coral">RESOLVED 30D {resolved.length}</span>
      </div>

      <Card>
        {open.length === 0 ? (
          <EmptyState title="No open incidents." description="All services are within SLA." />
        ) : (
          <>
            <TableHead cols={COLS}>
              <span>REF</span>
              <span>INCIDENT AND SERVICE</span>
              <span>SEV</span>
              <span>BREACH</span>
            </TableHead>
            {open.map((inc, i) => {
              const mins = inc.breachAt ? minutesUntil(inc.breachAt) : null;
              return (
                <TableRow cols={COLS} key={inc.id} last={i === open.length - 1}>
                  <span className="font-mono text-[9.5px] text-muted">{inc.ref}</span>
                  <Link href={`/hypercare/incidents/${inc.ref.toLowerCase()}`}>
                    <CellStack primary={inc.title} secondary={inc.serviceName.toUpperCase()} />
                  </Link>
                  <Pill tone={SEV_TONE[inc.severity] ?? "idle"} className="justify-self-start">
                    {inc.severity.toUpperCase()}
                  </Pill>
                  <span className={`font-mono text-[9.5px] ${mins != null && mins < 6 * 60 ? "text-block-fg" : "text-muted"}`}>
                    {mins != null ? formatDuration(mins) : "—"}
                  </span>
                </TableRow>
              );
            })}
          </>
        )}
      </Card>
    </div>
  );
}
