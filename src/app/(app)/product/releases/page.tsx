import { PageHeading } from "@/components/ui/Card";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { listReleases } from "@/lib/data/product";
import { ReleasesTable } from "./ReleasesTable";

export default async function ReleasesPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const releases = workspaceId ? await listReleases(workspaceId) : [];

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px] mx-auto">
      <PageHeading title="Releases" description="Every release across all products, with the readiness the criteria checklist computes." />
      <ReleasesTable releases={releases} />
    </div>
  );
}
