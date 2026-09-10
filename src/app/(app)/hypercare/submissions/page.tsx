import { PageHeading } from "@/components/ui/Card";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { getSelectedClientId } from "@/lib/data/client-scope";
import { listClientSubmissions } from "@/lib/data/client-submissions";
import { getWorkspaceInternalPeople } from "@/lib/data/project";
import { ClientSubmissionsTable } from "./ClientSubmissionsTable";

export default async function ClientSubmissionsPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const clientId = await getSelectedClientId();
  const [submissions, people] = workspaceId
    ? await Promise.all([listClientSubmissions(workspaceId, clientId), getWorkspaceInternalPeople(workspaceId)])
    : [[], []];
  const open = submissions.filter((s) => s.status !== "resolved");

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px] mx-auto">
      <PageHeading
        title="Client submissions"
        description="What clients typed into the portal, before anyone on the team saw it — Report an issue, Change request, Ask a question. Distinct from internally-logged incidents and requests."
      />

      <ClientSubmissionsTable submissions={submissions} people={people} />

      {open.length === 0 && submissions.length > 0 ? (
        <p className="text-[11.5px] text-muted">All caught up — every submission is resolved.</p>
      ) : null}
    </div>
  );
}
