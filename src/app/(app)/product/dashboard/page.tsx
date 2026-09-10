import { Card } from "@/components/ui/Card";
import { getProductDashboardData } from "@/lib/data/dashboard";
import { getProductDashboard } from "./actions";
import { ProductDashboardEditor } from "./ProductDashboardEditor";

export default async function ProductDashboardPage() {
  const [dashboard, live] = await Promise.all([getProductDashboard(), getProductDashboardData()]);

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-5 max-w-[1400px] mx-auto">
      <div className="flex flex-col gap-[5px]">
        <span className="w-[34px] h-[3px] bg-coral rounded-[2px]" />
        <h1 className="m-0 font-display font-extrabold text-[20px] text-ink">Product — Client dashboard</h1>
        <p className="m-0 text-[12.5px] text-muted max-w-[66ch]">
          One workspace-wide dashboard, shown to every client on their portal. Product has no per-client data by
          design, so blocks here only ever read shipped, client-visible roadmap items — never a fabricated
          per-client view.
        </p>
      </div>
      <Card className="p-4">
        <ProductDashboardEditor dashboardId={dashboard.id} blocks={dashboard.blocks} data={live.data} publishedAt={dashboard.publishedAt} />
      </Card>
    </div>
  );
}
