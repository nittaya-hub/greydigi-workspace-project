import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getProjectByRef, getProjectShareLinks } from "@/lib/data/project";
import { createShareLink } from "./actions";
import { ShareLinksTable } from "./ShareLinksTable";

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

      <ShareLinksTable links={links} projectRef={project.ref} />

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
