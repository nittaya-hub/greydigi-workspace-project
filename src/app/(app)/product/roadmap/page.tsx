import { PageHeading, Card } from "@/components/ui/Card";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { getRoadmapBoard } from "@/lib/data/product";
import { createClient } from "@/lib/supabase/server";
import { RoadmapView, type TimelineItem } from "./RoadmapView";

export default async function RoadmapPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const columns = workspaceId ? await getRoadmapBoard(workspaceId) : [];

  // Extra fetch (beyond getRoadmapBoard's column grouping) to give the
  // timeline view a real date axis: each item's release target_date, or
  // its quarter when it has no release yet.
  let timelineItems: TimelineItem[] = [];
  if (workspaceId) {
    const supabase = await createClient();
    const { data: products } = await supabase.from("products").select("id").eq("workspace_id", workspaceId);
    const productIds = (products ?? []).map((p) => p.id);
    if (productIds.length) {
      const [{ data: items }, { data: releases }] = await Promise.all([
        supabase.from("roadmap_items").select("ref, title, quarter, release_id").in("product_id", productIds),
        supabase.from("releases").select("id, code, target_date").in("product_id", productIds),
      ]);
      const releaseById = new Map((releases ?? []).map((r) => [r.id, r]));
      timelineItems = (items ?? []).map((it) => {
        const release = it.release_id ? releaseById.get(it.release_id) : null;
        return {
          ref: it.ref,
          title: it.title,
          columnLabel: release ? release.code.toUpperCase() : it.quarter ? it.quarter.toUpperCase() : "FORECAST",
          targetDate: release?.target_date ?? null,
          quarter: it.quarter,
        };
      });
    }
  }

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px] mx-auto">
      <RoadmapView
        heading={<PageHeading title="Roadmap" description="Committed work has a release. Forecast work has a quarter and nothing more." />}
        columns={columns}
        timelineItems={timelineItems}
      />

      <Card className="p-4 flex flex-col gap-1.5">
        <span className="font-mono text-[9px] tracking-[.09em] text-muted">PRIORITISATION INPUT</span>
        <span className="text-[11.5px] text-muted leading-[1.55]">
          The roadmap is not a wish list — items enter it because a delivery gate is blocked or a hypercare
          incident pattern repeated, tracked explicitly via cross-space links.
        </span>
      </Card>
    </div>
  );
}
