import Link from "next/link";
import { PageHeading, Card, EmptyState } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { getSelectedClientId } from "@/lib/data/client-scope";
import { listEscalations } from "@/lib/data/hypercare";
import { createClient } from "@/lib/supabase/server";
import { AcknowledgeButton } from "./AcknowledgeButton";
import { EscalateFurtherButton } from "./EscalateFurtherButton";

export default async function EscalationsPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const clientId = await getSelectedClientId();
  const escalations = workspaceId ? await listEscalations(workspaceId, clientId) : [];

  let people: { id: string; fullName: string }[] = [];
  if (workspaceId) {
    const supabase = await createClient();
    const { data } = await supabase.from("people").select("id, full_name").eq("workspace_id", workspaceId).eq("kind", "internal");
    people = (data ?? []).map((p) => ({ id: p.id, fullName: p.full_name }));
  }

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px]">
      <PageHeading
        title="Escalations"
        description="Escalation levels come from the SLA policy on the service and fire automatically at 75% and 100% of target."
      />

      {escalations.length === 0 ? (
        <Card>
          <EmptyState title="Nothing escalated." description="Escalation levels come from the SLA policy on the service and fire automatically at 75% and 100% of target." />
        </Card>
      ) : (
        escalations.map((e) => (
          <Card key={e.id} className="border-coral">
            <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-coral">
              <span className="font-display font-extrabold text-[13.5px]">
                {e.incidentRef ? (
                  <Link href={`/hypercare/incidents/${e.incidentRef.toLowerCase()}`}>{e.incidentRef}</Link>
                ) : null}{" "}
                escalated on {e.serviceName}
              </span>
              <Pill tone="waiting_on_client">OPEN</Pill>
            </div>
            <div className="px-4 py-3.5 flex flex-col gap-2">
              <span className="text-[11.5px] text-muted leading-[1.5]">{e.reason}</span>
              <span className="font-mono text-[9.5px] text-muted">ESCALATED TO {e.escalatedToName.toUpperCase()}</span>
              <div className="flex gap-1.5 mt-1">
                <AcknowledgeButton escalationId={e.id} />
                <EscalateFurtherButton escalationId={e.id} people={people} />
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
