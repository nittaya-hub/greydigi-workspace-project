import { notFound } from "next/navigation";
import { getProjectByRef, getProjectChangeRequests } from "@/lib/data/project";
import { RaiseChangeRequestButton } from "./RaiseChangeRequestButton";
import { ChangeRequestsTable } from "./ChangeRequestsTable";

export default async function ProjectChangeRequestsPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const project = await getProjectByRef(ref);
  if (!project) notFound();

  const crs = await getProjectChangeRequests(project.id);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-4">
        <p className="m-0 text-[12.5px] text-muted max-w-[66ch]">
          Every CR names its impact on dates, effort and price before it can be sent for approval.
        </p>
        <RaiseChangeRequestButton projectId={project.id} projectRef={project.ref} />
      </div>

      <ChangeRequestsTable crs={crs} projectId={project.id} projectRef={project.ref} />
    </div>
  );
}
