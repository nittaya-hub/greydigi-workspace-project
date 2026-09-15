import { notFound } from "next/navigation";
import { PageHeading, Card, CardHeader, StatTile } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { getProductDetail, listLockedTemplateVersions } from "@/lib/data/product";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { createClient } from "@/lib/supabase/server";
import { TrackSelect } from "./TrackSelect";
import { GateEvidenceForm } from "./GateEvidenceForm";
import { AdvanceGateButton } from "./AdvanceGateButton";
import { SellToClientButton } from "../SellToClientButton";
import { AttachDeliveryTemplateSelect } from "../AttachDeliveryTemplateSelect";

const GATES = ["G1", "G2", "G3", "G4", "G5"] as const;
const GATE_LABEL: Record<string, string> = {
  G1: "Business case",
  G2: "Build committed",
  G3: "Design partner",
  G4: "Launch ready",
  G5: "Scale",
};

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProductDetail(id);
  if (!product) notFound();

  const workspaceId = await getCurrentWorkspaceId();
  const [templateOptions, clientsResult] = await Promise.all([
    workspaceId ? listLockedTemplateVersions(workspaceId) : Promise.resolve([]),
    workspaceId
      ? (await createClient()).from("clients").select("id, name").eq("workspace_id", workspaceId).order("name")
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);
  const clients = clientsResult.data ?? [];

  const currentIdx = product.stageGate ? GATES.indexOf(product.stageGate) : -1;
  const nextGate = product.track === "market" ? (currentIdx < GATES.length - 1 ? GATES[currentIdx + 1] : null) : null;

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-5 max-w-[900px] mx-auto">
      <div className="flex items-end justify-between gap-4">
        <PageHeading
          title={product.name}
          description={product.description ?? undefined}
          eyebrow={product.track ? `${product.track.toUpperCase()} TRACK` : "UNCLASSIFIED"}
        />
        <TrackSelect productId={product.id} track={product.track} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatTile label="FEATURES" value={product.featureCount} />
        <StatTile label="MISSIONS USING THIS" value={product.usedByCount} />
        <StatTile label="GATES REACHED" value={product.gateHistory.length} note="/5" />
      </div>

      {product.track === "market" ? (
        <Card className="p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-display font-extrabold text-[13px]">Stage gates</span>
            <AdvanceGateButton productId={product.id} nextGate={nextGate} />
          </div>
          <div className="flex gap-2 flex-wrap">
            {GATES.map((g, i) => {
              const reached = currentIdx >= i;
              return (
                <Pill key={g} tone={reached ? "done" : "idle"}>
                  {g} · {GATE_LABEL[g]}
                </Pill>
              );
            })}
          </div>
          {product.gateHistory.length > 0 ? (
            <div className="flex flex-col gap-1 pt-2 border-t border-line-soft">
              {product.gateHistory.map((h) => (
                <span key={h.stageGate} className="font-mono text-[9.5px] text-muted">
                  {h.stageGate} reached {new Date(h.reachedAt).toLocaleDateString()}
                  {h.reachedByName ? ` · ${h.reachedByName}` : ""}
                </span>
              ))}
            </div>
          ) : null}
        </Card>
      ) : product.track === "platform" ? (
        <Card className="p-4">
          <span className="text-[11.5px] text-muted leading-[1.55]">
            Platform track: no external customer, no launch date. Gated on adoption and reuse instead — see how many
            missions use this above, and Manifest's reuse numbers.
          </span>
        </Card>
      ) : (
        <Card className="p-4">
          <span className="text-[11.5px] text-muted leading-[1.55]">Set a track above to gate this product — Platform (internal capability) or Market (sold to clients).</span>
        </Card>
      )}

      <Card>
        <CardHeader title="Delivery template" note="A SALE CARRIES THIS" />
        <div className="px-4 py-3.5">
          {product.deliveryTemplateVersionId ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11.5px] text-muted">{product.deliveryTemplateLabel}</span>
              <SellToClientButton productId={product.id} productName={product.name} templateVersionId={product.deliveryTemplateVersionId} clients={clients} />
            </div>
          ) : (
            <AttachDeliveryTemplateSelect productId={product.id} templateOptions={templateOptions} />
          )}
        </div>
      </Card>

      {product.track === "market" ? (
        <Card>
          <CardHeader title="Gate evidence" note="EDITABLE ANYTIME" />
          <div className="px-4 py-3.5">
            <GateEvidenceForm product={product} />
          </div>
        </Card>
      ) : null}
    </div>
  );
}
