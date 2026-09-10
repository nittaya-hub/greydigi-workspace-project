import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Eyebrow } from "@/components/ui/Card";
import { ProjectTabs } from "@/components/ui/ProjectTabs";
import { getProjectByRef } from "@/lib/data/project";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { EditProjectButton } from "./EditProjectButton";
import { DeleteProjectButton } from "./DeleteProjectButton";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ ref: string }>;
}) {
  const { ref } = await params;
  const project = await getProjectByRef(ref);
  if (!project) notFound();
  const viewer = await getCurrentPerson();

  const base = `/delivery/projects/${project.ref.toLowerCase()}`;
  const tabs = [
    { label: "Overview", href: base },
    { label: "Tasks and milestones", href: `${base}/tasks` },
    { label: "Flight plan check", href: `${base}/flight-plan-check` },
    { label: "Documents", href: `${base}/documents` },
    { label: "Baselines", href: `${base}/baselines` },
    { label: "Change requests", href: `${base}/change-requests` },
    { label: "Client updates", href: `${base}/client-updates` },
    { label: "Checkpoint data", href: `${base}/checkpoint` },
    { label: "Client view config", href: `${base}/client-view-config` },
    { label: "Share links", href: `${base}/share-links` },
    { label: "Members", href: `${base}/members` },
  ];

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-5 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-[5px] min-w-0">
          <span className="w-[34px] h-[3px] bg-coral rounded-[2px]" />
          <Eyebrow>
            {project.ref} · {project.clientName} · MISSION
          </Eyebrow>
          <h1 className="m-0 font-display font-extrabold text-[23px] tracking-[-0.02em] text-ink">{project.name}</h1>
          {project.description ? <p className="m-0 text-[12.5px] text-muted max-w-[66ch]">{project.description}</p> : null}
        </div>
        <div className="flex gap-1.5 flex-none">
          <EditProjectButton
            projectId={project.id}
            projectRef={project.ref}
            name={project.name}
            description={project.description}
            goLiveTarget={project.goLiveTarget}
          />
          {viewer?.workspace_role === "workspace_admin" ? (
            <DeleteProjectButton projectId={project.id} projectRef={project.ref} name={project.name} />
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto">
        <ProjectTabs tabs={tabs} />
      </div>

      {children}
    </div>
  );
}
