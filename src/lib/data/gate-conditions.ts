import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notifyWorkspace } from "@/lib/data/notify";
import { ensureServiceForProject, isGate5Cleared } from "@/lib/data/service-provisioning";

/** Runs after any write to a project_gate_condition row, regardless of
 * who or what wrote it — a person clicking Mark met/Waive/Revert on the
 * Flight plan check page (flight-plan-check/actions.ts), or a document
 * upload auto-confirming its matching condition (documents/actions.ts).
 * Plain shared helper rather than an export from a "use server" actions
 * file, so importing it from another module never risks Next treating
 * it as a public server action in its own right — it takes a raw
 * Supabase client as its first argument, which isn't a valid action
 * signature anyway. */
export async function afterConditionWrite(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  projectRef: string
) {
  // The gate-recompute trigger (fn_recompute_project_gates, 0006_state_
  // engine.sql) already ran by the time this write's statement commits,
  // so this is a read of already-derived state -- if it just cleared G5,
  // this project earns its Hypercare service (Services list page: "Created
  // at G5 from the delivery project. Never created by hand.").
  const { data: project } = await supabase
    .from("projects")
    .select("id, workspace_id, client_id, name")
    .eq("id", projectId)
    .maybeSingle();
  if (project && (await isGate5Cleared(supabase, projectId))) {
    const { created, ref } = await ensureServiceForProject(supabase, {
      id: project.id,
      workspaceId: project.workspace_id,
      clientId: project.client_id,
      name: project.name,
    });
    if (created && ref) {
      await notifyWorkspace(project.workspace_id, {
        kind: "service_created",
        title: `Service created: ${project.name}`,
        body: `${project.name} cleared G5 and is now live as ${ref} in Hypercare.`,
        relatedUrl: `/hypercare/services/${ref.toLowerCase()}`,
      });
    }
  }

  revalidatePath(`/delivery/projects/${projectRef.toLowerCase()}/flight-plan-check`);
  revalidatePath(`/delivery/projects/${projectRef.toLowerCase()}`);
  revalidatePath("/hypercare/services");
}
