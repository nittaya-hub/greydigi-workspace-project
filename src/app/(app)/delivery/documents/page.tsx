import Link from "next/link";
import { PageHeading, Card, EmptyState } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { TableHead, TableRow, CellStack } from "@/components/ui/Table";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { listProjects } from "@/lib/data/delivery";
import { getSelectedClientId } from "@/lib/data/client-scope";
import { createClient } from "@/lib/supabase/server";

const COLS = "1fr 1fr 62px 104px 104px";

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
  const clientVisible = (documents ?? []).filter((d) => d.visibility === "client_visible").length;
  const awaitingSignature = (documents ?? []).filter((d) => d.requires_signature && !d.signed_at).length;

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px]">
      <PageHeading
        title="Documents"
        description="Every artefact across the space. Visibility decides what a project's published projection can read."
      />
      <div className="flex gap-1.5 flex-wrap">
        <span className="font-mono text-[9px] tracking-[.06em] rounded-[5px] px-[7px] py-[3px] bg-ink text-white">
          ALL {(documents ?? []).length}
        </span>
        <span className="font-mono text-[9px] tracking-[.06em] rounded-[5px] px-[7px] py-[3px] border border-line text-coral">
          CLIENT VISIBLE {clientVisible}
        </span>
        {awaitingSignature > 0 ? (
          <span className="font-mono text-[9px] tracking-[.06em] rounded-[5px] px-[7px] py-[3px] border border-line text-coral">
            AWAITING SIGNATURE {awaitingSignature}
          </span>
        ) : null}
      </div>
      <Card>
        {(documents ?? []).length === 0 ? (
          <EmptyState title="No documents yet." description="Uploaded artefacts and generated documents will appear here." />
        ) : (
          <>
            <TableHead cols={COLS}>
              <span>ARTEFACT</span>
              <span>PROJECT</span>
              <span>VER</span>
              <span>VISIBILITY</span>
              <span>STATUS</span>
            </TableHead>
            {(documents ?? []).map((d, i) => {
              const project = d.project_id ? projectById.get(d.project_id) : undefined;
              return (
                <TableRow cols={COLS} key={d.id} last={i === (documents ?? []).length - 1}>
                  <CellStack primary={d.name} secondary={d.kind.toUpperCase()} />
                  {project ? (
                    <Link href={`/delivery/projects/${project.ref.toLowerCase()}/documents`} className="text-[12.5px] text-ink truncate">
                      {project.ref}
                    </Link>
                  ) : (
                    <span className="text-muted">Workspace-level</span>
                  )}
                  <span className="font-mono text-[9.5px] text-muted">{d.version}</span>
                  <Pill tone={d.visibility === "client_visible" ? "waiting_on_client" : "idle"} className="justify-self-start">
                    {d.visibility === "client_visible" ? "CLIENT" : "INTERNAL"}
                  </Pill>
                  <Pill tone={!d.requires_signature ? "in_progress" : d.signed_at ? "done" : "blocked"} className="justify-self-start">
                    {!d.requires_signature ? "CURRENT" : d.signed_at ? "SIGNED" : "UNSIGNED"}
                  </Pill>
                </TableRow>
              );
            })}
          </>
        )}
      </Card>
    </div>
  );
}
