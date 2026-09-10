import { PageHeading } from "@/components/ui/Card";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { listProjects } from "@/lib/data/delivery";
import { getSelectedClientId } from "@/lib/data/client-scope";
import { createClient } from "@/lib/supabase/server";
import { GatesTable, type GateTableRow } from "./GatesTable";

export default async function GatesPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const clientId = await getSelectedClientId();
  const projects = workspaceId ? await listProjects(workspaceId, clientId) : [];
  const supabase = await createClient();

  const projectIds = projects.map((p) => p.id);
  const { data: gates } = projectIds.length
    ? await supabase
        .from("project_gates")
        .select("id, code, status, sequence, project_id, held_since, cleared_at, target_date")
        .in("project_id", projectIds)
    : {
        data: [] as {
          id: string;
          code: string;
          status: string;
          sequence: number;
          project_id: string;
          held_since: string | null;
          cleared_at: string | null;
          target_date: string | null;
        }[],
      };

  const gateIds = (gates ?? []).map((g) => g.id);
  const { data: conditions } = gateIds.length
    ? await supabase.from("project_gate_conditions").select("project_gate_id, status").in("project_gate_id", gateIds)
    : { data: [] as { project_gate_id: string; status: string }[] };

  const metCountByGate = new Map<string, { met: number; total: number }>();
  for (const c of conditions ?? []) {
    const cur = metCountByGate.get(c.project_gate_id) ?? { met: 0, total: 0 };
    cur.total++;
    if (c.status !== "open") cur.met++;
    metCountByGate.set(c.project_gate_id, cur);
  }

  const projectById = new Map(projects.map((p) => [p.id, p]));
  const rows: GateTableRow[] = (gates ?? []).map((g) => {
    const project = projectById.get(g.project_id);
    const counts = metCountByGate.get(g.id) ?? { met: 0, total: 0 };
    return {
      id: g.id,
      code: g.code,
      status: g.status,
      met: counts.met,
      total: counts.total,
      recency: g.held_since ?? g.cleared_at ?? g.target_date,
      projectRef: project?.ref ?? null,
      projectName: project?.name ?? null,
    };
  });

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px] mx-auto">
      <PageHeading
        title="Gates"
        description="Every gate across the space. A gate clears when every condition is met or explicitly overridden."
      />
      <GatesTable rows={rows} />
    </div>
  );
}
