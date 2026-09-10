import Link from "next/link";
import { PageHeading, Card, EmptyState } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { TableHead, TableRow, CellStack } from "@/components/ui/Table";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { getSelectedClientId } from "@/lib/data/client-scope";
import { listServices } from "@/lib/data/hypercare";

const COLS = "1fr 86px 62px 92px";
const HEALTH_TONE: Record<string, "blocked" | "watch" | "in_progress" | "done"> = {
  at_risk: "blocked",
  watch: "watch",
  healthy: "done",
};
const HEALTH_LABEL: Record<string, string> = { at_risk: "AT RISK", watch: "WATCH", healthy: "HEALTHY" };

export default async function ServicesListPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const clientId = await getSelectedClientId();
  const services = workspaceId ? await listServices(workspaceId, clientId) : [];

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px] mx-auto">
      <PageHeading
        title="Services"
        description="Created at G5 from the delivery project. Never created by hand for a live client system."
      />
      <Card>
        {services.length === 0 ? (
          <EmptyState
            title="No live services yet."
            description="The first service appears when a delivery project clears G5. Nothing here is created by hand."
          />
        ) : (
          <>
            <TableHead cols={COLS}>
              <span>SERVICE AND ORIGIN</span>
              <span>SLA</span>
              <span>OPEN</span>
              <span>HEALTH</span>
            </TableHead>
            {services.map((s, i) => (
              <TableRow cols={COLS} key={s.id} last={i === services.length - 1}>
                <Link href={`/hypercare/services/${s.ref.toLowerCase()}`}>
                  <CellStack
                    primary={s.name}
                    secondary={`${s.ref}${s.originProjectRef ? ` · FROM ${s.originProjectRef}` : ""}${s.liveSince ? ` · LIVE ${s.liveSince}` : ""}`}
                  />
                </Link>
                <span className="font-mono text-[9.5px] text-muted">{s.slaName ?? "—"}</span>
                <span className="font-mono text-[9.5px] text-muted">{s.openCount}</span>
                <Pill tone={HEALTH_TONE[s.health]} className="justify-self-start">
                  {HEALTH_LABEL[s.health]}
                </Pill>
              </TableRow>
            ))}
          </>
        )}
      </Card>
    </div>
  );
}
