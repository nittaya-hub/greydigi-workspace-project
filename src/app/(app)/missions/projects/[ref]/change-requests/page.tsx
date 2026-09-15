import { notFound } from "next/navigation";
import { getProjectByRef, getProjectChangeRequests } from "@/lib/data/project";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { RaiseChangeRequestButton } from "./RaiseChangeRequestButton";
import { ChangeRequestsTable } from "./ChangeRequestsTable";

export default async function ProjectChangeRequestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ ref: string }>;
  searchParams: Promise<{ raisedFrom?: string }>;
}) {
  const { ref } = await params;
  const { raisedFrom } = await searchParams;
  const project = await getProjectByRef(ref);
  if (!project) notFound();

  const crs = await getProjectChangeRequests(project.id);
  const viewer = await getCurrentPerson();
  // Matches requireMissionsLead in auth-guard.ts exactly -- deciding a CR
  // is restricted to this mission's lead or a workspace admin, so the
  // buttons only render where the action would actually succeed.
  const canDecide =
    viewer?.workspace_role === "workspace_admin" ||
    viewer?.workspace_role === "delivery_lead" ||
    (!!viewer && viewer.id === project.leadPersonId);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-4">
        <p className="m-0 text-[12.5px] text-muted max-w-[66ch]">
          Every CR names its impact on dates, effort and price before it can be sent for approval.
        </p>
        <RaiseChangeRequestButton
          projectId={project.id}
          projectRef={project.ref}
          defaultRaisedFromRef={raisedFrom}
          autoOpen={!!raisedFrom}
        />
      </div>

      <ChangeRequestsTable crs={crs} projectId={project.id} projectRef={project.ref} canDecide={canDecide} />
    </div>
  );
}
