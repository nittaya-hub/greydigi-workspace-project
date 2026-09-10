import { ProjectOverviewMain } from "@/components/delivery/ProjectOverviewMain";
import { ExportPdfButton } from "@/components/pdf/ExportPdfButton";

export default async function ProjectOverviewPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref: projectRef } = await params;

  return (
    <>
      <div className="flex justify-end">
        <ExportPdfButton
          href={`/delivery/projects/${projectRef.toLowerCase()}/pdf`}
          fallbackFilename={`${projectRef}-overview.pdf`}
          allowOrientationChoice
        />
      </div>
      <ProjectOverviewMain projectRef={projectRef} />
    </>
  );
}
