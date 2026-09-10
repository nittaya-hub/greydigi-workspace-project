import { PageHeading } from "@/components/ui/Card";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { listProjects } from "@/lib/data/delivery";
import { getSelectedClientId } from "@/lib/data/client-scope";
import { createClient } from "@/lib/supabase/server";
import { DocumentsWorkspaceTable, type WorkspaceDocumentRow } from "./DocumentsWorkspaceTable";

export default async function DeliveryDocumentsPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const clientId = await getSelectedClientId();
  const projects = workspaceId ? await listProjects(workspaceId, clientId) : [];
  const supabase = await createClient();

  const projectIds = projects.map((p) => p.id);
  const { data: documents } = projectIds.length
    ? await supabase
        .from("documents")
        .select("id, project_id, name, kind, version, visibility, requires_signature, signed_at, created_at")
        .in("project_id", projectIds)
        .order("created_at", { ascending: false })
    : {
        data: [] as {
          id: string;
          project_id: string | null;
          name: string;
          kind: string;
          version: string;
          visibility: string;
          requires_signature: boolean;
          signed_at: string | null;
        }[],
      };

  const projectById = new Map(projects.map((p) => [p.id, p]));
  const rows: WorkspaceDocumentRow[] = (documents ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    kind: d.kind,
    version: d.version,
    visibility: d.visibility,
    requiresSignature: d.requires_signature,
    signedAt: d.signed_at,
    projectRef: d.project_id ? projectById.get(d.project_id)?.ref ?? null : null,
  }));

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px] mx-auto">
      <PageHeading
        title="Documents"
        description="Every artefact across the space. Visibility decides what a project's published projection can read."
      />
      <DocumentsWorkspaceTable documents={rows} />
    </div>
  );
}
