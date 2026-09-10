import type { DashboardBlockRow, DashboardData } from "@/lib/dashboard/types";
import { TextBlock } from "@/components/dashboard/blocks/TextBlock";
import { ImageBlock } from "@/components/dashboard/blocks/ImageBlock";
import { FlightPlanBlock } from "@/components/dashboard/blocks/FlightPlanBlock";
import { DocumentsBlock } from "@/components/dashboard/blocks/DocumentsBlock";
import { EmbedBlock } from "@/components/dashboard/blocks/EmbedBlock";
import { MetricBlock } from "@/components/dashboard/blocks/MetricBlock";
import { ChartBlock } from "@/components/dashboard/blocks/ChartBlock";

/** Picks the renderer for one block. The bounded library the WordPress-
 * style dashboard is built from — no raw HTML/script block exists here by
 * design (see the embed block's own allow-list). */
export function BlockRenderer({ block, data }: { block: DashboardBlockRow; data: DashboardData }) {
  switch (block.blockType) {
    case "text":
      return <TextBlock config={block.config} />;
    case "image":
      return <ImageBlock config={block.config} />;
    case "flight_plan":
      return <FlightPlanBlock data={data} />;
    case "documents":
      return <DocumentsBlock data={data} />;
    case "embed":
      return <EmbedBlock config={block.config} />;
    case "metric":
      return <MetricBlock config={block.config} data={data} />;
    case "chart":
      return <ChartBlock config={block.config} data={data} />;
    default:
      return null;
  }
}
