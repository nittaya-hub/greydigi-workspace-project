import { notFound } from "next/navigation";
import { ClientProjectsRollup } from "@/components/portal/ClientProjectsRollup";
import { getPortalCurrentClientId, getPortalClientProjects } from "@/lib/data/portal";
import { getHypercareDashboard, getProductDashboardData } from "@/lib/data/dashboard";

export default async function ClientPortalRollupPage() {
  const clientId = await getPortalCurrentClientId();
  if (!clientId) notFound();

  const [result, hypercare, product] = await Promise.all([
    getPortalClientProjects(clientId),
    getHypercareDashboard(clientId),
    getProductDashboardData(),
  ]);
  if (result.state !== "ok") notFound();

  return <ClientProjectsRollup result={result} hypercare={hypercare} product={product} />;
}
