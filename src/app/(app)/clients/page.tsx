import Link from "next/link";
import { PageHeading, Card, EmptyState } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { TableHead, TableRow } from "@/components/ui/Table";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { listClients } from "@/lib/data/clients";
import { AddClientButton } from "./AddClientButton";

const COLS = "1fr 74px 76px 96px";

export default async function ClientsPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const clients = workspaceId ? await listClients(workspaceId) : [];

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px]">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <PageHeading title="Clients" description="Delivery projects, product dependencies and hypercare services all point here." />
        <AddClientButton />
      </div>

      <Card>
        {clients.length === 0 ? (
          <EmptyState title="No clients yet." description="A client is the anchor every project, service and person points to." />
        ) : (
          <>
            <TableHead cols={COLS}>
              <span>CLIENT</span>
              <span>PROJECTS</span>
              <span>SERVICES</span>
              <span>STATE</span>
            </TableHead>
            {clients.map((c, i) => (
              <TableRow cols={COLS} key={c.id} last={i === clients.length - 1}>
                <Link href={`/clients/${c.id}`} className="text-[12.5px] font-semibold text-ink">
                  {c.name}
                </Link>
                <span className="font-mono text-[9.5px] text-muted">{c.projectCount}</span>
                <span className="font-mono text-[9.5px] text-muted">{c.serviceCount}</span>
                <Pill tone={c.hasAtRiskService ? "blocked" : "done"} className="justify-self-start">
                  {c.hasAtRiskService ? "AT RISK" : "ACTIVE"}
                </Pill>
              </TableRow>
            ))}
          </>
        )}
      </Card>
    </div>
  );
}
