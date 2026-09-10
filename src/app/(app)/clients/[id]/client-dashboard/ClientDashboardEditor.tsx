"use client";

import { BlockEditorCanvas } from "@/components/dashboard/BlockEditorCanvas";
import type { DashboardBlockRow } from "@/lib/dashboard/service";
import type { DashboardData } from "@/lib/dashboard/types";
import type { DashboardBlockType } from "@/lib/supabase/database.types";
import {
  addClientDashboardBlock,
  updateClientDashboardBlockConfig,
  updateClientDashboardLayout,
  removeClientDashboardBlock,
  publishClientDashboard,
  unpublishClientDashboard,
} from "./actions";

export function ClientDashboardEditor({
  clientId,
  dashboardId,
  blocks,
  data,
  publishedAt,
}: {
  clientId: string;
  dashboardId: string;
  blocks: DashboardBlockRow[];
  data: DashboardData;
  publishedAt: string | null;
}) {
  return (
    <BlockEditorCanvas
      space="hypercare"
      blocks={blocks}
      data={data}
      publishedAt={publishedAt}
      actions={{
        addBlock: (blockType: DashboardBlockType) => addClientDashboardBlock(clientId, dashboardId, blockType),
        updateBlockConfig: (blockId, config) => updateClientDashboardBlockConfig(clientId, blockId, config),
        updateLayout: (layout) => updateClientDashboardLayout(clientId, layout),
        removeBlock: (blockId) => removeClientDashboardBlock(clientId, blockId),
        publish: () => publishClientDashboard(clientId, dashboardId),
        unpublish: () => unpublishClientDashboard(clientId, dashboardId),
      }}
    />
  );
}
