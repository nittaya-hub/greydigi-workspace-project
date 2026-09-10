"use client";

import { BlockEditorCanvas } from "@/components/dashboard/BlockEditorCanvas";
import type { DashboardBlockRow } from "@/lib/dashboard/service";
import type { DashboardData } from "@/lib/dashboard/types";
import type { DashboardBlockType } from "@/lib/supabase/database.types";
import {
  addProductDashboardBlock,
  updateProductDashboardBlockConfig,
  updateProductDashboardLayout,
  removeProductDashboardBlock,
  publishProductDashboard,
  unpublishProductDashboard,
} from "./actions";

export function ProductDashboardEditor({
  dashboardId,
  blocks,
  data,
  publishedAt,
}: {
  dashboardId: string;
  blocks: DashboardBlockRow[];
  data: DashboardData;
  publishedAt: string | null;
}) {
  return (
    <BlockEditorCanvas
      space="product"
      blocks={blocks}
      data={data}
      publishedAt={publishedAt}
      actions={{
        addBlock: (blockType: DashboardBlockType) => addProductDashboardBlock(dashboardId, blockType),
        updateBlockConfig: (blockId, config) => updateProductDashboardBlockConfig(blockId, config),
        updateLayout: (layout) => updateProductDashboardLayout(layout),
        removeBlock: (blockId) => removeProductDashboardBlock(blockId),
        publish: () => publishProductDashboard(dashboardId),
        unpublish: () => unpublishProductDashboard(dashboardId),
      }}
    />
  );
}
