import { notFound } from "next/navigation";
import { Card, CardHeader, EmptyState } from "@/components/ui/Card";
import { TableHead, TableRow, CellStack } from "@/components/ui/Table";
import { getProjectByRef, getWorkspaceInternalPeople } from "@/lib/data/project";
import { listProjectMembers, getMyProjectRole } from "@/lib/data/project-members";
import { AddProjectMemberButton } from "./AddProjectMemberButton";
import { RemoveProjectMemberButton } from "./RemoveProjectMemberButton";

const COLS = "1fr 140px 110px 70px";

export default async function ProjectMembersPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const project = await getProjectByRef(ref);
  if (!project) notFound();

  const [members, people, myRole] = await Promise.all([
    listProjectMembers(project.id),
    getWorkspaceInternalPeople(project.workspaceId),
    getMyProjectRole(project.id),
  ]);

  const isAdmin = myRole === "workspace_admin" || myRole === "project_admin";
  const memberPersonIds = new Set(members.map((m) => m.personId));
  const candidates = people.filter((p) => !memberPersonIds.has(p.id));

  return (
    <div className="flex flex-col gap-5">
      <p className="m-0 text-[12.5px] text-muted max-w-[66ch]">
        Who can act on this project. Project Admin has full control of this project only; Member edits their own
        tasks and can comment on any task here, but can&apos;t touch phases, gates, baselines, change requests, or
        this list.
      </p>

      <Card>
        <CardHeader
          title="Members"
          note={isAdmin ? <AddProjectMemberButton projectId={project.id} projectRef={project.ref} candidates={candidates} /> : "WHO CAN ACT HERE"}
        />
        {members.length === 0 ? (
          <EmptyState
            title="No project-level members yet."
            description="Everyone with workspace_admin already has full access. Add a Project Admin or Member here to grant someone narrower access."
          />
        ) : (
          <>
            <TableHead cols={COLS}>
              <span>PERSON</span>
              <span>ROLE</span>
              <span>ADDED</span>
              <span />
            </TableHead>
            {members.map((m, i) => (
              <TableRow key={m.id} cols={COLS} last={i === members.length - 1}>
                <CellStack primary={m.fullName} />
                <span className="font-mono text-[10px] text-muted">
                  {m.role === "project_admin" ? "PROJECT ADMIN" : "MEMBER"}
                </span>
                <span className="font-mono text-[9.5px] text-muted">{m.createdAt.slice(0, 10)}</span>
                {isAdmin ? (
                  <RemoveProjectMemberButton projectId={project.id} projectRef={project.ref} memberId={m.id} />
                ) : (
                  <span />
                )}
              </TableRow>
            ))}
          </>
        )}
      </Card>
    </div>
  );
}
