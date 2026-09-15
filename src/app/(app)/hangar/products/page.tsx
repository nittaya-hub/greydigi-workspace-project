import { PageHeading, Card, EmptyState } from "@/components/ui/Card";
import { TableHead, TableRow, CellStack } from "@/components/ui/Table";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { listProducts, listLockedTemplateVersions } from "@/lib/data/product";
import { createClient } from "@/lib/supabase/server";
import { NewProductButton } from "./NewProductButton";
import { SellToClientButton } from "./SellToClientButton";
import { AttachDeliveryTemplateSelect } from "./AttachDeliveryTemplateSelect";

const COLS = "1fr 50px 74px 1.4fr";

export default async function ProductsListPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const [products, templateOptions] = workspaceId
    ? await Promise.all([listProducts(workspaceId), listLockedTemplateVersions(workspaceId)])
    : [[], []];

  let clients: { id: string; name: string }[] = [];
  if (workspaceId) {
    const supabase = await createClient();
    const { data } = await supabase.from("clients").select("id, name").eq("workspace_id", workspaceId).order("name");
    clients = data ?? [];
  }

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <PageHeading title="Products" description="Reusable capability. If two client projects need the same thing twice, it belongs here." />
        <NewProductButton templateOptions={templateOptions} />
      </div>

      <Card>
        {products.length === 0 ? (
          <EmptyState
            title="No products yet."
            description="The hangar space stays empty until a pattern repeats. Promoting the first one from a missions project is the usual route."
          />
        ) : (
          <>
            <TableHead cols={COLS}>
              <span>PRODUCT</span>
              <span>FEAT</span>
              <span>USED BY</span>
              <span>DELIVERY TEMPLATE / SALE</span>
            </TableHead>
            {products.map((p, i) => (
              <TableRow cols={COLS} key={p.id} last={i === products.length - 1}>
                <CellStack primary={p.name} secondary={p.description ?? undefined} />
                <span className="font-mono text-[9.5px] text-muted">{p.featureCount}</span>
                <span className="font-mono text-[9.5px] text-muted">{p.usedByCount}</span>
                {p.deliveryTemplateVersionId ? (
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[11px] text-muted truncate">{p.deliveryTemplateLabel}</span>
                    <SellToClientButton
                      productId={p.id}
                      productName={p.name}
                      templateVersionId={p.deliveryTemplateVersionId}
                      clients={clients}
                    />
                  </div>
                ) : (
                  <AttachDeliveryTemplateSelect productId={p.id} templateOptions={templateOptions} />
                )}
              </TableRow>
            ))}
          </>
        )}
      </Card>
    </div>
  );
}
