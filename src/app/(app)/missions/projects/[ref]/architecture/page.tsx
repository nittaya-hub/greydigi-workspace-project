import { notFound } from "next/navigation";
import { Card, EmptyState } from "@/components/ui/Card";
import { getProjectByRef } from "@/lib/data/project";
import { getProjectArchitecture, getArchitectureSourceFiles } from "@/lib/data/architecture";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { UploadArchitectureExcelButton } from "./UploadArchitectureExcelButton";
import { ArchitectureDiagram } from "./ArchitectureDiagram";
import { ArchitectureSourceFileRow } from "./ArchitectureSourceFileRow";
import { ExpandArchitectureButton } from "./ExpandArchitectureButton";

export default async function SolutionArchitecturePage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const project = await getProjectByRef(ref);
  if (!project) notFound();

  const [architecture, sourceFiles, viewer] = await Promise.all([
    getProjectArchitecture(project.id),
    getArchitectureSourceFiles(project.id),
    getCurrentPerson(),
  ]);

  // Matches every other Checkpoint/Timeline mutation's own gate --
  // this mission's lead or a workspace admin only. Unlike Checkpoint
  // data, this page never crosses into Client view config or the
  // client portal at all: the source deck marks this exact page
  // "REFERENCE · NOT WALKED THROUGH ... CONFIDENTIAL", so it stays
  // an internal reference the delivery team maintains, full stop.
  const canEdit =
    viewer?.workspace_role === "workspace_admin" ||
    viewer?.workspace_role === "delivery_lead" ||
    (!!viewer && viewer.id === project.leadPersonId);

  return (
    <div className="flex flex-col gap-5">
      <p className="m-0 text-[12.5px] text-muted max-w-[70ch]">
        Internal reference only -- how this project&apos;s systems actually connect, one column per stage, left to
        right. This never appears in Client view config or the client portal: it&apos;s the team&apos;s own working
        diagram, not something walked through with a client.
      </p>

      <Card className="p-4">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div>
            <span className="block text-[12.5px] font-semibold text-ink">Source spreadsheets</span>
            <span className="block font-mono text-[9.5px] text-muted">.XLSX WITH COLUMN / NODE / DETAIL / ICON / CONNECTS TO</span>
          </div>
          {canEdit ? (
            <UploadArchitectureExcelButton projectId={project.id} projectRef={project.ref} workspaceId={project.workspaceId} />
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          {sourceFiles.length === 0 ? (
            <EmptyState
              title="No spreadsheets imported yet."
              description="Upload an .xlsx to map columns and modules in one go, or build the diagram below by hand."
            />
          ) : (
            sourceFiles.map((f) => <ArchitectureSourceFileRow key={f.id} file={f} projectId={project.id} projectRef={project.ref} canEdit={canEdit} />)
          )}
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div>
            <span className="block text-[12.5px] font-semibold text-ink">Solution architecture</span>
            <span className="block font-mono text-[9.5px] text-muted">COLUMNS ARE STAGES, LEFT TO RIGHT · MODULES AND CONNECTIONS ARE YOURS TO EDIT</span>
          </div>
          <ExpandArchitectureButton data={architecture} projectId={project.id} projectRef={project.ref} />
        </div>
        <ArchitectureDiagram data={architecture} projectId={project.id} projectRef={project.ref} canEdit={canEdit} />
      </Card>
    </div>
  );
}
