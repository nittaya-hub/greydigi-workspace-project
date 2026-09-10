import { PageHeading, Card, EmptyState } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { TableHead, TableRow, CellStack } from "@/components/ui/Table";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { getSelectedClientId } from "@/lib/data/client-scope";
import { listRequests, listServices } from "@/lib/data/hypercare";
import { NewRequestButton } from "./NewRequestButton";

const COLS = "60px 1fr 56px 112px";
const STATUS_TONE: Record<string, "watch" | "in_progress" | "idle" | "waiting_on_client"> = {
  open: "idle",
  in_progress: "in_progress",
  done: "in_progress",
};

function ageDays(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export default async function RequestsPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const clientId = await getSelectedClientId();
  const requests = workspaceId ? await listRequests(workspaceId, clientId) : [];
  const services = workspaceId ? await listServices(workspaceId, clientId) : [];
  const open = requests.filter((r) => r.status !== "done");

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <PageHeading title="Requests" description="Nothing is broken. A client wants something small, or an answer. Anything over half a day becomes a CR." />
        <NewRequestButton services={services.map((s) => ({ id: s.id, ref: s.ref, name: s.name }))} />
      </div>

      <Card>
        {open.length === 0 ? (
          <EmptyState title="Queue is clear." description="No open requests on any service. Clients can raise one from the portal at any time." />
        ) : (
          <>
            <TableHead cols={COLS}>
              <span>REF</span>
              <span>REQUEST AND SERVICE</span>
              <span>AGE</span>
              <span>STATUS</span>
            </TableHead>
            {open.map((r, i) => {
              const days = ageDays(r.openedAt);
              return (
                <TableRow cols={COLS} key={r.id} last={i === open.length - 1}>
                  <span className="font-mono text-[9.5px] text-muted">{r.ref}</span>
                  <CellStack primary={r.title} secondary={r.serviceName.toUpperCase()} />
                  <span className={`font-mono text-[9.5px] ${days > 14 ? "text-warn-fg" : "text-muted"}`}>{days}d</span>
                  <Pill tone={STATUS_TONE[r.status] ?? "idle"} className="justify-self-start">
                    {r.status.replace(/_/g, " ").toUpperCase()}
                  </Pill>
                </TableRow>
              );
            })}
          </>
        )}
      </Card>
    </div>
  );
}
