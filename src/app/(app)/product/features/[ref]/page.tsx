import { notFound } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { getFeatureByRef } from "@/lib/data/product";
import { FeatureClientVisibleToggle } from "../FeatureClientVisibleToggle";

const STATUS_LABEL: Record<string, string> = {
  forecast: "FORECAST",
  committed: "COMMITTED",
  in_progress: "IN BUILD",
  done: "SHIPPED",
};

export default async function FeatureDetailPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const feature = await getFeatureByRef(ref);
  if (!feature) notFound();

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-5 max-w-[820px] mx-auto">
      <div className="flex flex-col gap-1.5">
        <span className="w-[34px] h-[3px] bg-coral rounded-[2px]" />
        <span className="font-mono text-[9.5px] text-muted">
          {feature.ref} · {feature.productName}
          {feature.releaseCode ? ` · RELEASE ${feature.releaseCode.toUpperCase()}` : ""}
        </span>
        <h1 className="m-0 font-display font-extrabold text-[20px] text-ink">{feature.title}</h1>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        <Pill tone="waiting_on_client">{STATUS_LABEL[feature.status] ?? feature.status.toUpperCase()}</Pill>
      </div>

      <Card className="p-4 flex items-center gap-2.5">
        <span className="flex-1">
          <span className="block text-[12.5px] font-semibold text-ink">Client visible</span>
          <span className="block font-mono text-[9.5px] text-muted">Flags this item for a client-facing roadmap view</span>
        </span>
        <FeatureClientVisibleToggle itemId={feature.id} itemRef={feature.ref} initialOn={feature.clientVisible} />
      </Card>

      {feature.description ? (
        <Card className="p-4">
          <span className="text-[12px] text-muted leading-[1.55]">{feature.description}</span>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Work" note={`${feature.work.filter((w) => w.status === "done").length} OF ${feature.work.length} CLOSED`} />
        {feature.work.length === 0 ? (
          <div className="px-4 py-6 text-center text-[11.5px] text-muted">No engineering tasks logged yet.</div>
        ) : (
          <div className="flex flex-col">
            {feature.work.map((w, i) => (
              <div key={i} className="grid grid-cols-[1fr_100px_auto] gap-2.5 items-center px-4 py-[11px] border-b border-line-soft last:border-b-0 text-[12px]">
                <span className="text-ink">{w.title}</span>
                <span className="text-muted">{w.assigneeName}</span>
                <Pill tone={w.status === "done" ? "done" : w.status === "in_progress" ? "in_progress" : "idle"} className="justify-self-start">
                  {w.status.replace(/_/g, " ").toUpperCase()}
                </Pill>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
