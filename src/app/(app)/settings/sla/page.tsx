import { PageHeading, Card, CardHeader } from "@/components/ui/Card";
import { AdminOnlyNotice } from "@/components/ui/AdminOnlyNotice";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { createClient } from "@/lib/supabase/server";
import { SlaPolicyRow } from "./SlaPolicyRow";

export default async function SlaSettingsPage() {
  const viewer = await getCurrentPerson();
  if (viewer?.workspace_role !== "workspace_admin") return <AdminOnlyNotice title="SLA policies" />;

  const workspaceId = await getCurrentWorkspaceId();
  let rows: {
    id: string;
    serviceName: string;
    responseTargetMinutes: number;
    resolveTargetMinutes: number;
    businessHoursOnly: boolean;
  }[] = [];

  if (workspaceId) {
    const supabase = await createClient();
    const { data: services } = await supabase.from("services").select("id, name").eq("workspace_id", workspaceId);
    const serviceIds = (services ?? []).map((s) => s.id);
    const serviceNameById = new Map((services ?? []).map((s) => [s.id, s.name]));

    if (serviceIds.length) {
      const { data: policies } = await supabase
        .from("sla_policies")
        .select("id, service_id, response_target_minutes, resolve_target_minutes, business_hours_only")
        .in("service_id", serviceIds);
      rows = (policies ?? []).map((p) => ({
        id: p.id,
        serviceName: serviceNameById.get(p.service_id) ?? "—",
        responseTargetMinutes: p.response_target_minutes,
        resolveTargetMinutes: p.resolve_target_minutes,
        businessHoursOnly: p.business_hours_only,
      }));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeading title="SLA policies" description="Response and resolve targets, in minutes, one policy per service." />

      <Card>
        <CardHeader title="Policies" note={`${rows.length} SERVICE${rows.length === 1 ? "" : "S"}`} />
        {rows.length === 0 ? (
          <div className="py-10 px-4 text-center text-[12.5px] text-muted">
            No SLA policies yet. A policy is created alongside a service in Hypercare → Services.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_100px_100px_120px_84px] gap-2.5 px-4 py-2.5 bg-[#FCFCFA] border-b border-line-soft font-mono text-[9px] tracking-[.08em] text-muted">
              <span>SERVICE</span>
              <span>RESPONSE (MIN)</span>
              <span>RESOLVE (MIN)</span>
              <span>HOURS</span>
              <span />
            </div>
            {rows.map((r) =>
              workspaceId ? (
                <SlaPolicyRow
                  key={r.id}
                  policyId={r.id}
                  workspaceId={workspaceId}
                  serviceName={r.serviceName}
                  responseTargetMinutes={r.responseTargetMinutes}
                  resolveTargetMinutes={r.resolveTargetMinutes}
                  businessHoursOnly={r.businessHoursOnly}
                />
              ) : null
            )}
          </>
        )}
      </Card>
    </div>
  );
}
