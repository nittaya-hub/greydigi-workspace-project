import { PageHeading, Card, EmptyState } from "@/components/ui/Card";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { listDecisions } from "@/lib/data/manifest";
import { createClient } from "@/lib/supabase/server";
import { NewDecisionButton } from "./NewDecisionButton";

export default async function ManifestDecisionsPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const decisions = workspaceId ? await listDecisions(workspaceId) : [];

  let projects: { id: string; ref: string; name: string }[] = [];
  if (workspaceId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("projects")
      .select("id, ref, name")
      .eq("workspace_id", workspaceId)
      .eq("status", "active")
      .order("ref");
    projects = data ?? [];
  }

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-5 max-w-[1400px] mx-auto">
      <div className="flex items-end justify-between gap-4">
        <PageHeading
          size="md"
          title="Decisions"
          description="Decisions, objections and how they resolved — the pattern library the next intake and proposal draw from."
        />
        <NewDecisionButton projects={projects} />
      </div>

      {decisions.length === 0 ? (
        <Card>
          <EmptyState title="No decisions logged yet." description="Log the first one from a mission worth remembering the next time this comes up." />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {decisions.map((d) => (
            <Card key={d.id} className="p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <span className="font-display font-extrabold text-[13px]">{d.decision}</span>
                <span className="font-mono text-[9.5px] text-muted flex-none">{d.projectRef}</span>
              </div>
              {d.objection ? (
                <p className="m-0 text-[11.5px] text-muted leading-[1.5]">
                  <span className="font-semibold text-ink">Objection: </span>
                  {d.objection}
                </p>
              ) : null}
              <p className="m-0 text-[11.5px] text-ink leading-[1.5]">
                <span className="font-semibold">Resolution: </span>
                {d.resolution}
              </p>
              <span className="font-mono text-[9px] text-muted">{new Date(d.createdAt).toLocaleDateString()}</span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
