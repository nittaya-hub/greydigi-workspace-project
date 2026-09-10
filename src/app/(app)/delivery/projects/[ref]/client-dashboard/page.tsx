import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { getProjectByRef } from "@/lib/data/project";
import { getProjectDashboard } from "./actions";
import { getDeliveryDashboard } from "@/lib/data/dashboard";
import { DeliveryDashboardEditor } from "./DeliveryDashboardEditor";

export default async function ProjectClientDashboardPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const project = await getProjectByRef(ref);
  if (!project) notFound();

  const [dashboard, live] = await Promise.all([getProjectDashboard(project.id), getDeliveryDashboard(project.id)]);

  return (
    <div className="flex flex-col gap-5">
      <p className="m-0 text-[12.5px] text-muted max-w-[66ch]">
        Build a custom client dashboard from bounded blocks — text, images, the flight-plan spine, documents, an
        embed, metrics, and charts. Drag to move, drag a corner to resize. Nothing shows on the portal until
        published.
      </p>
      <Card className="p-4">
        <DeliveryDashboardEditor
          projectRef={project.ref}
          dashboardId={dashboard.id}
          blocks={dashboard.blocks}
          data={live.data}
          publishedAt={dashboard.publishedAt}
        />
      </Card>
    </div>
  );
}
