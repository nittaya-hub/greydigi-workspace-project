import { notFound } from "next/navigation";
import { Card, EmptyState } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { TableHead, TableRow, CellStack } from "@/components/ui/Table";
import { getProjectByRef, getProjectShareLinks } from "@/lib/data/project";
import { createShareLink } from "./actions";
import { ShareLinkActions } from "./ShareLinkActions";

const COLS = "1fr 84px 66px 78px 280px";

export default async function ShareLinksPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const project = await getProjectByRef(ref);
  if (!project) notFound();

  const links = await getProjectShareLinks(project.id);

  async function create() {
    "use server";
    await createShareLink(project!.id, project!.ref);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-4">
        <p className="m-0 text-[12.5px] text-muted max-w-[66ch]">
          A link shows the same published projection as the portal, with no login. Every view is logged.
        </p>
        <form action={create} className="flex-none">
          <Button variant="primary" type="submit">
            Create link
          </Button>
        </form>
      </div>

      <Card>
        {links.length === 0 ? (
          <EmptyState
            title="No links created."
            description="Use a link for a stakeholder who should not have a portal account, like a board member or a site manager."
          />
        ) : (
          <>
            <TableHead cols={COLS}>
              <span>LINK</span>
              <span>EXPIRES</span>
              <span>VIEWS</span>
              <span>STATUS</span>
              <span>ACTIONS</span>
            </TableHead>
            {links.map((l, i) => (
              <TableRow cols={COLS} key={l.id} last={i === links.length - 1}>
                <CellStack primary={`/s/${l.token}`} secondary={`CREATED BY ${l.createdByName.toUpperCase()}`} />
                <span className="font-mono text-[9.5px] text-muted">{l.expiresAt?.slice(0, 10) ?? "—"}</span>
                <span className="font-mono text-[9.5px] text-muted">{l.viewCount}</span>
                <Pill tone={l.status === "active" ? "done" : "idle"} className="justify-self-start">
                  {l.status.toUpperCase()}
                </Pill>
                <ShareLinkActions linkId={l.id} token={l.token} projectRef={project.ref} status={l.status} />
              </TableRow>
            ))}
          </>
        )}
      </Card>

      <Card className="p-4 flex flex-col gap-1.5">
        <span className="font-mono text-[9px] tracking-[.09em] text-muted">LINK RULES</span>
        <span className="text-[11.5px] text-muted leading-[1.55]">
          Links carry an expiry by default, 30 days maximum. Revoking or regenerating is immediate and invalidates
          the old token. A link can never expose more than the published projection, so tightening client view
          config also tightens every live link. No client account or login is required to open one.
        </span>
      </Card>
    </div>
  );
}
