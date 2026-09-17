import { createClient } from "@/lib/supabase/server";
import { PageHeading } from "@/components/ui/Card";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { listAgentDefinitions, listAgentConnections } from "@/lib/data/agents";
import { ConnectWizard } from "./ConnectWizard";

/** Server wrapper: resolves everything the wizard's dropdowns need
 * (existing definitions/connections to reuse, missions to scope to,
 * people to name as owner/reviewer) and hands typed data to the client
 * component. The wizard itself holds all 5 steps of state — see
 * ConnectWizard.tsx. */
export default async function ConnectAgentPage() {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    return (
      <div className="px-4 py-5 sm:px-7 sm:py-8 max-w-[900px] mx-auto">
        <PageHeading title="Connect agent" description="Sign in to continue." />
      </div>
    );
  }

  const supabase = await createClient();
  const [definitions, connections, projectsRes, peopleRes] = await Promise.all([
    listAgentDefinitions(workspaceId),
    listAgentConnections(workspaceId),
    supabase.from("projects").select("id, ref, name").eq("workspace_id", workspaceId).eq("status", "active").order("ref"),
    supabase.from("people").select("id, full_name").eq("workspace_id", workspaceId).eq("kind", "internal").order("full_name"),
  ]);

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 max-w-[900px] mx-auto flex flex-col gap-6">
      <PageHeading
        title="Connect agent"
        description="Choose → Connect → Scope → Automate → Test & activate. Every step saves as a draft — nothing here can run a real task or spend money yet."
      />
      <ConnectWizard
        definitions={definitions}
        connections={connections}
        projects={(projectsRes.data ?? []).map((p) => ({ id: p.id, ref: p.ref, name: p.name }))}
        people={(peopleRes.data ?? []).map((p) => ({ id: p.id, fullName: p.full_name }))}
      />
    </div>
  );
}
