import Link from "next/link";
import { PageHeading, Card, EmptyState } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { listMembers } from "@/lib/data/admin";

const COLS = "1fr 70px 70px 70px";

export default async function MembersPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const members = workspaceId ? await listMembers(workspaceId) : [];
  const internalCount = members.filter((m) => m.kind === "internal").length;
  const clientCount = members.filter((m) => m.kind === "client").length;

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px]">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <PageHeading title="Users and members" description="Internal and client people in one table. Roles are scoped per space and per client." />
        <LinkButton href="/people/invite" variant="primary" className="flex-none">
          Invite
        </LinkButton>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        <span className="font-mono text-[9px] tracking-[.06em] rounded-[5px] px-[7px] py-[3px] bg-ink text-white">ALL {members.length}</span>
        <span className="font-mono text-[9px] tracking-[.06em] rounded-[5px] px-[7px] py-[3px] border border-line text-coral">INTERNAL {internalCount}</span>
        <span className="font-mono text-[9px] tracking-[.06em] rounded-[5px] px-[7px] py-[3px] border border-line text-coral">CLIENT {clientCount}</span>
      </div>

      <Card>
        {members.length === 0 ? (
          <EmptyState title="No members yet." description="Invite the first workspace admin to get started." />
        ) : (
          <>
            <div style={{ gridTemplateColumns: COLS }} className="grid gap-2 px-4 py-2.5 bg-[#FCFCFA] border-b border-line-soft font-mono text-[9px] tracking-[.08em] text-muted">
              <span>PERSON</span>
              <span>DELIVERY</span>
              <span>PRODUCT</span>
              <span>HYPERCARE</span>
            </div>
            {members.map((m, i) => (
              <div
                key={m.id}
                style={{ gridTemplateColumns: COLS }}
                className={`grid gap-2 items-center px-4 py-[11px] text-[12px] ${i < members.length - 1 ? "border-b border-line-soft" : ""}`}
              >
                <span className="flex flex-col gap-0.5">
                  {m.kind === "internal" ? (
                    <Link href={`/people/${m.id}`} className="text-[12.5px] font-semibold text-ink hover:text-coral w-fit">
                      {m.fullName}
                    </Link>
                  ) : (
                    <span className="text-[12.5px] font-semibold text-ink">{m.fullName}</span>
                  )}
                  <span className="font-mono text-[9.5px] text-muted">
                    {m.workspaceRole === "workspace_admin" ? "WORKSPACE ADMIN" : m.kind.toUpperCase()}
                    {m.clientName ? ` · ${m.clientName.toUpperCase()}` : ""}
                    {!m.hasPortalAccess && m.kind === "client" ? " · INVITED" : ""}
                  </span>
                </span>
                {(["delivery", "product", "hypercare"] as const).map((space) => (
                  <span key={space} className="font-mono text-[9.5px] text-muted">
                    {m.workspaceRole === "workspace_admin" ? "ADMIN" : (m.spaceRoles[space] ?? "—").toUpperCase()}
                  </span>
                ))}
              </div>
            ))}
          </>
        )}
      </Card>

      <Card className="p-4 flex flex-col gap-1.5">
        <span className="font-mono text-[9px] tracking-[.09em] text-muted">CLIENT ROLES</span>
        <span className="text-[11.5px] text-muted leading-[1.55]">
          Client roles never see internal effort, rates or task detail regardless of Client View Config.
        </span>
      </Card>
    </div>
  );
}
