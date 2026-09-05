import Link from "next/link";
import { PageHeading, Card, EmptyState } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { TableHead, TableRow, CellStack } from "@/components/ui/Table";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { listReleases } from "@/lib/data/product";

const COLS = "1fr 1fr 96px 90px 96px";

const STATUS_TONE: Record<string, "idle" | "in_progress" | "done" | "waiting_on_client"> = {
  planning: "idle",
  in_progress: "in_progress",
  ready: "waiting_on_client",
  shipped: "done",
};

export default async function ReleasesPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const releases = workspaceId ? await listReleases(workspaceId) : [];

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px]">
      <PageHeading title="Releases" description="Every release across all products, with the readiness the criteria checklist computes." />
      <Card>
        {releases.length === 0 ? (
          <EmptyState title="No releases yet." description="A release ships a set of features together once its criteria are met." />
        ) : (
          <>
            <TableHead cols={COLS}>
              <span>RELEASE</span>
              <span>PRODUCT</span>
              <span>TARGET</span>
              <span>READY</span>
              <span>STATUS</span>
            </TableHead>
            {releases.map((r, i) => (
              <TableRow cols={COLS} key={r.code} last={i === releases.length - 1}>
                <Link href={`/product/releases/${r.code.toLowerCase()}`} className="min-w-0">
                  <CellStack primary={r.name} secondary={r.code.toUpperCase()} />
                </Link>
                <span className="text-muted truncate">{r.productName}</span>
                <span className="font-mono text-[9.5px] text-muted">{r.targetDate ?? "—"}</span>
                <span className="font-mono text-[9.5px] text-muted">{r.readinessPct}%</span>
                <Pill tone={STATUS_TONE[r.status] ?? "idle"} className="justify-self-start">
                  {r.status.replace(/_/g, " ").toUpperCase()}
                </Pill>
              </TableRow>
            ))}
          </>
        )}
      </Card>
    </div>
  );
}
