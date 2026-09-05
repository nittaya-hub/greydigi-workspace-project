import Link from "next/link";
import { PageHeading, Card, EmptyState } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { TableHead, TableRow } from "@/components/ui/Table";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { listFeatures } from "@/lib/data/product";
import { FeatureClientVisibleToggle } from "./FeatureClientVisibleToggle";

const COLS = "1fr 62px 1fr 96px 96px 78px";

const STATUS_TONE: Record<string, "idle" | "in_progress" | "done" | "waiting_on_client"> = {
  forecast: "idle",
  committed: "waiting_on_client",
  in_progress: "in_progress",
  done: "done",
};

export default async function FeaturesPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const features = workspaceId ? await listFeatures(workspaceId) : [];

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px]">
      <PageHeading title="Features" description="Every epic and feature across all products, committed or forecast." />
      <Card>
        {features.length === 0 ? (
          <EmptyState title="No features yet." description="Features and epics appear here once added to a product's roadmap." />
        ) : (
          <>
            <TableHead cols={COLS}>
              <span>FEATURE</span>
              <span>KIND</span>
              <span>PRODUCT</span>
              <span>RELEASE</span>
              <span>STATUS</span>
              <span>CLIENT</span>
            </TableHead>
            {features.map((f, i) => (
              <TableRow cols={COLS} key={f.ref} last={i === features.length - 1}>
                <Link href={`/product/features/${f.ref.toLowerCase()}`} className="min-w-0 flex flex-col gap-0.5">
                  <span className="text-[12.5px] font-semibold text-ink truncate">{f.title}</span>
                  <span className="font-mono text-[9.5px] text-muted">{f.ref}</span>
                </Link>
                <span className="font-mono text-[9.5px] text-muted">{f.kind.toUpperCase()}</span>
                <span className="text-muted truncate">{f.productName}</span>
                <span className="font-mono text-[9.5px] text-muted">{f.releaseCode ?? "—"}</span>
                <Pill tone={STATUS_TONE[f.status] ?? "idle"} className="justify-self-start">
                  {f.status.replace(/_/g, " ").toUpperCase()}
                </Pill>
                <FeatureClientVisibleToggle itemId={f.id} itemRef={f.ref} initialOn={f.clientVisible} />
              </TableRow>
            ))}
          </>
        )}
      </Card>
    </div>
  );
}
