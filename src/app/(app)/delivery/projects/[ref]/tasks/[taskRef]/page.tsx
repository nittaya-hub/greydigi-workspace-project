import { notFound, redirect } from "next/navigation";
import { getProjectByRef, getTaskByRef } from "@/lib/data/project";

/** The full-page task detail view is gone — task detail now lives in the
 * TaskDrawer side-sheet on the tasks list (see ../page.tsx and
 * ../TaskDrawer.tsx). This route stays only as a deep-link fallback: an
 * old bookmarked `/tasks/<taskRef>` URL resolves the ref to a task id and
 * redirects into the list with the drawer pre-opened via `?task=<id>`,
 * so no link anyone has saved goes dead. */
export default async function TaskDetailRedirect({
  params,
}: {
  params: Promise<{ ref: string; taskRef: string }>;
}) {
  const { ref, taskRef } = await params;
  const project = await getProjectByRef(ref);
  if (!project) notFound();

  const task = await getTaskByRef(project.id, taskRef);
  if (!task) notFound();

  redirect(`/delivery/projects/${project.ref.toLowerCase()}/tasks?task=${task.id}`);
}
