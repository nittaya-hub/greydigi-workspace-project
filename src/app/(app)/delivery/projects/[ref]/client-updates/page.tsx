import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { LinkButton } from "@/components/ui/Button";
import { getProjectByRef, getProjectClientUpdates } from "@/lib/data/project";
import { NewClientUpdateButton } from "./NewClientUpdateButton";
import { PublishUpdateButton } from "./PublishUpdateButton";
import { PublishedUpdatesTable } from "./PublishedUpdatesTable";

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

      <PublishedUpdatesTable updates={published} />
    </div>
  );
}
