import { PageHeading, Card, EmptyState } from "@/components/ui/Card";
import { TableHead, TableRow, CellStack } from "@/components/ui/Table";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { listProducts } from "@/lib/data/product";
import { NewProductButton } from "./NewProductButton";

const COLS = "1fr 62px 74px";

export default async function ProductsListPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const products = workspaceId ? await listProducts(workspaceId) : [];

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <PageHeading title="Products" description="Reusable capability. If two client projects need the same thing twice, it belongs here." />
        <NewProductButton />
      </div>

      <Card>
        {products.length === 0 ? (
          <EmptyState
            title="No products yet."
            description="The product space stays empty until a pattern repeats. Promoting the first one from a delivery project is the usual route."
          />
        ) : (
          <>
            <TableHead cols={COLS}>
              <span>PRODUCT</span>
              <span>FEAT</span>
              <span>USED BY</span>
            </TableHead>
            {products.map((p, i) => (
              <TableRow cols={COLS} key={p.id} last={i === products.length - 1}>
                <CellStack primary={p.name} secondary={p.description ?? undefined} />
                <span className="font-mono text-[9.5px] text-muted">{p.featureCount}</span>
                <span className="font-mono text-[9.5px] text-muted">{p.usedByCount}</span>
              </TableRow>
            ))}
          </>
        )}
      </Card>
    </div>
  );
}
