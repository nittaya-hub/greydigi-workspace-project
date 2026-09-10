import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeading } from "@/components/ui/Card";
import { getProjectByRef } from "@/lib/data/project";
import { listCheckpointSnapshots } from "@/lib/data/checkpoint-history";
import { CheckpointHistoryTable } from "./CheckpointHistoryTable";

export default async function CheckpointHistoryPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const project = await getProjectByRef(ref);
  if (!project) notFound();

  const snapshots = await listCheckpointSnapshots(project.id);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <PageHeading
          title="Checkpoint history"
          description='Every week once published here is permanent — it can never be edited or deleted, only viewed or duplicated into a fresh, editable week on the Checkpoint data tab.'
        />
        <Link
          href={`/delivery/projects/${project.ref.toLowerCase()}/checkpoint`}
          className="font-mono text-[10px] tracking-[.04em] text-coral hover:underline whitespace-nowrap flex-none mt-1"
        >
          ← Back to Checkpoint data
        </Link>
      </div>

      <CheckpointHistoryTable snapshots={snapshots} projectId={project.id} projectRef={project.ref} />
    </div>
  );
}
