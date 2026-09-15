import Link from "next/link";
import { PageHeading, Card, CardHeader } from "@/components/ui/Card";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { listProjects } from "@/lib/data/delivery";
import { getSelectedClientId } from "@/lib/data/client-scope";
import { createClient } from "@/lib/supabase/server";
import { FlightPlansList, type FlightPlanRow } from "./FlightPlansList";

export default async function FlightPlansPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const clientId = await getSelectedClientId();
  const projects = workspaceId ? await listProjects(workspaceId, clientId) : [];
  const supabase = await createClient();

  const projectIds = projects.map((p) => p.id);
  const [{ data: phases }, { data: gates }] = await Promise.all([
    projectIds.length
      ? supabase
          .from("project_phases")
          .select("project_id, code, name, index, started_at, completed_at, duration_label, show_duration_label")
          .in("project_id", projectIds)
          .order("index")
      : Promise.resolve({
          data: [] as {
            project_id: string;
            code: string;
            name: string;
            index: number;
            started_at: string | null;
            completed_at: string | null;
            duration_label: string | null;
            show_duration_label: boolean;
          }[],
        }),
    projectIds.length
      ? supabase.from("project_gates").select("project_id, code, name, sequence, status, target_date").in("project_id", projectIds)
      : Promise.resolve({
          data: [] as { project_id: string; code: string; name: string; sequence: number; status: string; target_date: string | null }[],
        }),
  ]);

  const phasesByProject = new Map<string, typeof phases>();
  for (const ph of phases ?? []) {
    const list = phasesByProject.get(ph.project_id) ?? [];
    list.push(ph);
    phasesByProject.set(ph.project_id, list);
  }
  const gatesByProject = new Map<string, typeof gates>();
  for (const g of gates ?? []) {
    const list = gatesByProject.get(g.project_id) ?? [];
    list.push(g);
    gatesByProject.set(g.project_id, list);
  }

  const rows: FlightPlanRow[] = projects.map((p) => ({
    id: p.id,
    ref: p.ref,
    name: p.name,
    clientName: p.clientName,
    health: p.health,
    phases: (phasesByProject.get(p.id) ?? []).slice().sort((a, b) => a.index - b.index),
    gates: gatesByProject.get(p.id) ?? [],
  }));

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px] mx-auto">
      <PageHeading
        title="Flight plans"
        description="Every active project's phase spine, cloned from a template version at kickoff. Editing a template never moves work already in flight."
      />

      <FlightPlansList rows={rows} />

      <Card>
        <CardHeader title="Templates" note="MASTER FLIGHT PLANS" />
        <div className="px-4 py-3.5 flex items-center justify-between gap-3">
          <span className="text-[11.5px] text-muted leading-[1.5] max-w-[60ch]">
            Every flight plan above was cloned from a locked template version. Manage the master phases, gates and
            gate conditions on the Templates page.
          </span>
          <Link href="/templates" className="font-mono text-[10px] text-coral font-semibold flex-none">
            OPEN TEMPLATES →
          </Link>
        </div>
      </Card>
    </div>
  );
}
