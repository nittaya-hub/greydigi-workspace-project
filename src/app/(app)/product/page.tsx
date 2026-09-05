import Link from "next/link";
import { PageHeading, Card, CardHeader, StatTile, HeroPanel, Eyebrow } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { GateConditionRow } from "@/components/ui/GateConditionRow";
import { TableHead, TableRow, CellStack } from "@/components/ui/Table";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { getProductOverview, getReleaseByCode, listProducts } from "@/lib/data/product";
import { ExportCsvButton } from "./ExportCsvButton";
import { NewFeatureButton } from "./NewFeatureButton";

const FEAT_COLS = "62px 1fr 116px 76px 100px";

const STATUS_TONE: Record<string, "in_progress" | "waiting_on_client" | "watch" | "done" | "idle"> = {
  forecast: "idle",
  committed: "in_progress",
  in_progress: "waiting_on_client",
  done: "done",
};

export default async function ProductOverviewPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px]">
        <PageHeading title="Product" description="Accelerators and internal capability." />
        <Card className="p-5">
          <p className="text-[12.5px] text-muted">Not signed in, or this workspace has no data yet.</p>
        </Card>
      </div>
    );
  }

  const overview = await getProductOverview(workspaceId);
  const nextRelease = overview.nextRelease ? await getReleaseByCode(overview.nextRelease.code) : null;
  const products = await listProducts(workspaceId);

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px]">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <PageHeading
          title="Product"
          description="Accelerators and internal capability. Delivery projects depend on releases from here, and those dependencies are explicit."
        />
        <div className="flex gap-1.5 flex-none">
          <ExportCsvButton
            rows={overview.features.map((f) => ({
              ref: f.ref,
              title: f.title,
              product: f.productName,
              release: f.releaseCode ?? "",
              status: f.status,
            }))}
            filename="product-features.csv"
          />
          <NewFeatureButton products={products.map((p) => ({ id: p.id, name: p.name }))} />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="PRODUCTS" value={overview.productCount} />
        <StatTile label="FEATURES IN BUILD" value={overview.featuresInBuild} note={`Of ${overview.totalRoadmapItems} on the roadmap`} />
        <StatTile
          label="NEXT RELEASE"
          value={overview.nextRelease?.code ?? "—"}
          note={overview.nextRelease ? `${overview.nextRelease.readinessPct}% ready${overview.nextRelease.targetDate ? `, target ${overview.nextRelease.targetDate}` : ""}` : undefined}
        />
        <StatTile
          label="DELIVERY BLOCKED BY PRODUCT"
          value={overview.deliveryBlockedRefs.length}
          note={overview.deliveryBlockedRefs.join(", ") || undefined}
          accent={overview.deliveryBlockedRefs.length > 0}
        />
      </div>

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-4 items-start">
        <Card>
          <CardHeader title="Features" note={`${overview.totalRoadmapItems} TOTAL`} />
          {overview.features.length === 0 ? (
            <div className="py-10 px-4 text-center text-[12.5px] text-muted">No features on the roadmap yet.</div>
          ) : (
            <>
              <TableHead cols={FEAT_COLS}>
                <span>REF</span>
                <span>FEATURE</span>
                <span>PRODUCT</span>
                <span>RELEASE</span>
                <span>STATUS</span>
              </TableHead>
              {overview.features.map((f, i) => (
                <TableRow cols={FEAT_COLS} key={f.ref} last={i === overview.features.length - 1}>
                  <span className="font-mono text-[9.5px] text-muted">{f.ref}</span>
                  <Link href={`/product/features/${f.ref.toLowerCase()}`}>
                    <CellStack primary={f.title} />
                  </Link>
                  <span className="text-muted truncate">{f.productName}</span>
                  <span className="font-mono text-[9.5px] text-muted">{f.releaseCode ?? "—"}</span>
                  <Pill tone={STATUS_TONE[f.status] ?? "idle"} className="justify-self-start">
                    {f.status.replace(/_/g, " ").toUpperCase()}
                  </Pill>
                </TableRow>
              ))}
            </>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          {nextRelease ? (
            <HeroPanel>
              <Eyebrow className="text-muted-2">RELEASE {nextRelease.code.toUpperCase()} READINESS</Eyebrow>
              <div className="flex items-baseline gap-2.5">
                <span className="font-display font-extrabold text-[30px]">{nextRelease.readinessPct}%</span>
                <span className="text-[12px] text-muted-2">
                  {nextRelease.criteria.filter((c) => c.status !== "open").length} of {nextRelease.criteria.length} criteria met
                </span>
              </div>
              <div className="flex flex-col gap-2 mt-1">
                {nextRelease.criteria.map((c, i) => (
                  <GateConditionRow key={i} description={c.description} met={c.status !== "open"} />
                ))}
              </div>
              <span className="text-[11.5px] text-muted-2 leading-[1.5]">
                Readiness is met criteria over required criteria. Same rule as gate completion in delivery.
              </span>
            </HeroPanel>
          ) : null}

          {overview.releaseDependents.length > 0 ? (
            <Card>
              <CardHeader title="Who depends on this release" />
              <div className="px-4 py-3.5 flex flex-col gap-2.5">
                {overview.releaseDependents.map((d, i) => (
                  <div key={i} className="flex flex-col gap-0.5">
                    <span className="text-[12.5px] font-semibold text-ink">{d.projectName}</span>
                    <span className="font-mono text-[9.5px] text-muted">{d.note}</span>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
