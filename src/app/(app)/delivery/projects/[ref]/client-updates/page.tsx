import { notFound } from "next/navigation";
import { Card, EmptyState } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { LinkButton } from "@/components/ui/Button";
import { TableHead, TableRow } from "@/components/ui/Table";
import { getProjectByRef, getProjectClientUpdates } from "@/lib/data/project";
import { NewClientUpdateButton } from "./NewClientUpdateButton";
import { PublishUpdateButton } from "./PublishUpdateButton";

const COLS = "82px 1fr 96px";

export default async function ProjectClientUpdatesPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const project = await getProjectByRef(ref);
  if (!project) notFound();

  const updates = await getProjectClientUpdates(project.id);
  const draft = updates.find((u) => u.status === "draft");
  const published = updates.filter((u) => u.status === "published");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-4">
        <p className="m-0 text-[12.5px] text-muted max-w-[66ch]">
          A dated narrative the client reads. Drafts are internal until published, and a published update cannot be
          silently edited.
        </p>
        <NewClientUpdateButton projectId={project.id} projectRef={project.ref} />
      </div>

      {draft ? (
        <Card className="border-coral">
          <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-line">
            <span className="font-display font-extrabold text-[13.5px]">{draft.title}</span>
            <Pill tone="waiting_on_client">UNPUBLISHED</Pill>
          </div>
          <div className="px-4 py-3.5 flex flex-col gap-2.5">
            <span className="text-[12px] text-ink leading-[1.6]">{draft.body}</span>
            <div className="flex gap-1.5 pt-0.5">
              <PublishUpdateButton updateId={draft.id} projectRef={project.ref} />
              <LinkButton href={`/portal/${project.ref.toLowerCase()}`} variant="secondary">
                Preview as client
              </LinkButton>
            </div>
          </div>
        </Card>
      ) : null}

      <Card>
        {published.length === 0 ? (
          <EmptyState title="No updates published yet." description="Published updates appear here and in the client portal." />
        ) : (
          <>
            <TableHead cols={COLS}>
              <span>DATE</span>
              <span>UPDATE</span>
              <span>STATUS</span>
            </TableHead>
            {published.map((u, i) => (
              <TableRow cols={COLS} key={u.id} last={i === published.length - 1}>
                <span className="font-mono text-[9.5px] text-muted">{u.publishedAt?.slice(0, 10) ?? "—"}</span>
                <span className="text-[12.5px] font-semibold text-ink truncate">{u.title}</span>
                <Pill tone="done" className="justify-self-start">
                  PUBLISHED
                </Pill>
              </TableRow>
            ))}
          </>
        )}
      </Card>
    </div>
  );
}
