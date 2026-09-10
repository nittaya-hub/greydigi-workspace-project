import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { getClientById } from "@/lib/data/clients";
import { getHypercareDashboard } from "@/lib/data/dashboard";
import { getClientDashboard } from "./actions";
import { ClientDashboardEditor } from "./ClientDashboardEditor";

export default async function ClientDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getClientById(id);
  if (!client) notFound();

  const [dashboard, live] = await Promise.all([getClientDashboard(client.id), getHypercareDashboard(client.id)]);

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-5 max-w-[1400px] mx-auto">
      <div className="flex flex-col gap-[5px]">
        <span className="w-[34px] h-[3px] bg-coral rounded-[2px]" />
        <h1 className="m-0 font-display font-extrabold text-[20px] text-ink">{client.name} — Client dashboard</h1>
        <p className="m-0 text-[12.5px] text-muted max-w-[66ch]">
          The Hypercare-space view this client sees on their portal — incident and SLA status only, built from the
          same bounded block library as Delivery. Nothing shows until published.
        </p>
      </div>
      <Card className="p-4">
        <ClientDashboardEditor
          clientId={client.id}
          dashboardId={dashboard.id}
          blocks={dashboard.blocks}
          data={live.data}
          publishedAt={dashboard.publishedAt}
        />
      </Card>
    </div>
  );
}
