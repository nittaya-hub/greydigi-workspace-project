import { PageHeading } from "@/components/ui/Card";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { listFeatures } from "@/lib/data/product";
import { FeaturesTable } from "./FeaturesTable";

export default async function FeaturesPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const features = workspaceId ? await listFeatures(workspaceId) : [];

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px] mx-auto">
      <PageHeading title="Features" description="Every epic and feature across all products, committed or forecast." />
      <FeaturesTable features={features} />
    </div>
  );
}
