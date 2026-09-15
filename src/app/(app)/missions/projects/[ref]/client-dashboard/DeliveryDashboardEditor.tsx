"use client";

import { BlockEditorCanvas } from "@/components/dashboard/BlockEditorCanvas";
import type { DashboardBlockRow } from "@/lib/dashboard/service";
import type { DashboardData } from "@/lib/dashboard/types";
import type { DashboardBlockType } from "@/lib/supabase/database.types";
import {
  addProjectDashboardBlock,
  updateProjectDashboardBlockConfig,
  updateProjectDashboardLayout,
  removeProjectDashboardBlock,
  publishProjectDashboard,
  unpublishProjectDashboard,
} from "./actions";

export function DeliveryDashboardEditor({
  projectRef,
  dashboardId,
  blocks,
  data,
  publishedAt,
}: {
  projectRef: string;
  dashboardId: string;
  blocks: DashboardBlockRow[];
  data: DashboardData;
  publishedAt: string | null;
}) {
  return (
    <BlockEditorCanvas
      space="delivery"
      blocks={blocks}
      data={data}
      publishedAt={publishedAt}
      actions={{
        addBlock: (blockType: DashboardBlockType) => addProjectDashboardBlock(projectRef, dashboardId, blockType),
        updateBlockConfig: (blockId, config) => updateProjectDashboardBlockConfig(projectRef, blockId, config),
        updateLayout: (layout) => updateProjectDashboardLayout(projectRef, layout),
        removeBlock: (blockId) => removeProjectDashboardBlock(projectRef, blockId),
        publish: () => publishProjectDashboard(projectRef, dashboardId),
        unpublish: () => unpublishProjectDashboard(projectRef, dashboardId),
      }}
    />
  );
}
