import { PageHeading } from "@/components/ui/Card";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { listClients } from "@/lib/data/clients";
import { AddClientButton } from "./AddClientButton";
import { ClientsTable } from "./ClientsTable";

export default async function ClientsPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const clients = workspaceId ? await listClients(workspaceId) : [];

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <PageHeading title="Clients" description="Delivery projects, product dependencies and hypercare services all point here." />
        <AddClientButton />
      </div>

      <ClientsTable clients={clients} />
    </div>
  );
}
