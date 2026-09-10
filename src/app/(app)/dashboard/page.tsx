import { PageHeading } from "@/components/ui/Card";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { getCrossSpaceDashboard } from "@/lib/data/dashboard";
import { ExportButton } from "./ExportButton";
import { ExportPdfButton } from "@/components/pdf/ExportPdfButton";
import { CrossSpaceDashboardMain } from "@/components/dashboard/CrossSpaceDashboardMain";

export default async function CrossSpaceDashboardPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const data = workspaceId
    ? await getCrossSpaceDashboard(workspaceId)
    : { deliveryInFlight: 0, goLive30d: 0, servicesLive: 0, openIncidents: 0, atRiskCount: 0, handoverQueue: [], hypercareToChangeRequest: 0, hypercareToProductFeature: 0 };

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <PageHeading title="Where work crosses spaces" description="Every arrow is an explicit, audited relationship between records. None of these numbers are inferred." />
        <div className="flex gap-1.5 flex-none">
          <ExportButton data={data} />
          <ExportPdfButton
            href="/dashboard/pdf"
            fallbackFilename={`cross-space-dashboard-${new Date().toISOString().slice(0, 10)}.pdf`}
            allowOrientationChoice
          />
        </div>
      </div>

      <CrossSpaceDashboardMain data={data} />
    </div>
  );
}
