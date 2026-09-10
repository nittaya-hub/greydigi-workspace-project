import { PageHeading, Card, EmptyState, Eyebrow } from "@/components/ui/Card";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { listMembers } from "@/lib/data/admin";
import { UserAccessTable } from "./UserAccessTable";
import { ProjectGrantsTable, ProductGrantsTable } from "./GrantTables";

const TIERS: { name: string; can: string[]; cannot: string[] }[] = [
  {
    name: "Super Admin (workspace_admin)",
    can: [
      "Full read/write on every client, project, and workspace-wide record.",
      "Invite workspace members, grant client portal access, manage Settings.",
      "Create new projects and clients; publish/unpublish anything client-facing.",
    ],
    cannot: [],
  },
  {
    name: "Project Admin",
    can: [
      "Full CRUD (add, edit, delete, view) on the specific project(s) they're a member of.",
      "Manage that project's Members list — add or remove Project Admins/Members.",
      "Create/edit phases, gates, baselines, change requests, and publish the client view for that project.",
    ],
    cannot: [
      "See or act on any client, project, or workspace record outside their assigned project(s).",
      "Create a brand-new project, invite workspace members, or change workspace Settings.",
    ],
  },
  {
    name: "Member",
    can: [
      "Full edit on tasks assigned to them within a project they belong to.",
      "Comment on any task in a project they belong to (not just their own).",
      "View everything else the project surfaces — phases, gates, baselines, documents, client updates.",
    ],
    cannot: [
      "Create, delete, or reassign a task they don't own; create/delete phases, gates, baselines, or change requests.",
      "Manage the project's Members list, or touch client view config / share links.",
    ],
  },
  {
    name: "Product access (space_roles, separate from the tiers above)",
    can: [
      "Anyone granted Product access (via the toggle on the People page) gets full CRUD on Products, Roadmap, Releases, and Engineering — workspace-wide, not per-project, since Product is a reusable capability library, not owned by one client.",
    ],
    cannot: ["Someone without this grant sees nothing in the Product space, regardless of any project they're on."],
  },
];

export default async function PermissionsSettingsPage() {
  const viewer = await getCurrentPerson();
  if (viewer?.workspace_role !== "workspace_admin") {
    return (
      <div className="flex flex-col gap-5">
        <PageHeading title="Permissions" />
        <Card>
          <EmptyState title="Workspace admins only." description="This page shows every project-level and Product access grant in the workspace." />
        </Card>
      </div>
    );
  }

  const workspaceId = await getCurrentWorkspaceId();
  const members = workspaceId ? await listMembers(workspaceId) : [];

  const supabase = await createClient();
  const [{ data: grants }, { data: productGrants }] = await Promise.all([
    supabase
      .from("project_members")
      .select("id, role, created_at, projects(ref, name), people(full_name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("space_roles")
      .select("id, role, created_at, people(full_name)")
      .eq("space", "product")
      .order("created_at", { ascending: false }),
  ]);

  const projectRows = (grants ?? []).map((g) => {
    const project = Array.isArray(g.projects) ? g.projects[0] : g.projects;
    const person = Array.isArray(g.people) ? g.people[0] : g.people;
    return {
      id: g.id,
      role: g.role,
      createdAt: g.created_at,
      projectLabel: project ? `${project.ref} · ${project.name}` : "—",
      fullName: person?.full_name ?? "—",
    };
  });

  const productRows = (productGrants ?? []).map((g) => {
    const person = Array.isArray(g.people) ? g.people[0] : g.people;
    return { id: g.id, createdAt: g.created_at, fullName: person?.full_name ?? "—" };
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeading
        title="Permissions"
        description="What each access tier can and can't do, and every project-level or Product grant currently in effect. Visible to workspace admins only."
      />

      <div className="grid md:grid-cols-2 gap-4">
        {TIERS.map((tier) => (
          <Card key={tier.name} className="p-4 flex flex-col gap-3">
            <span className="font-display font-extrabold text-[13px] text-ink">{tier.name}</span>
            <div className="flex flex-col gap-1.5">
              <Eyebrow>CAN</Eyebrow>
              <ul className="m-0 pl-4 flex flex-col gap-1 text-[11.5px] text-muted leading-[1.5] list-disc">
                {tier.can.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
            {tier.cannot.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                <Eyebrow className="text-block-fg">CANNOT</Eyebrow>
                <ul className="m-0 pl-4 flex flex-col gap-1 text-[11.5px] text-muted leading-[1.5] list-disc">
                  {tier.cannot.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Eyebrow>USER ACCESS</Eyebrow>
        <UserAccessTable members={members} viewerIsAdmin />
      </div>

      <div className="flex flex-col gap-2">
        <Eyebrow>PROJECT-LEVEL GRANTS · {projectRows.length} TOTAL</Eyebrow>
        <ProjectGrantsTable rows={projectRows} />
      </div>

      <div className="flex flex-col gap-2">
        <Eyebrow>PRODUCT ACCESS GRANTS · {productRows.length} TOTAL</Eyebrow>
        <ProductGrantsTable rows={productRows} />
      </div>
    </div>
  );
}
