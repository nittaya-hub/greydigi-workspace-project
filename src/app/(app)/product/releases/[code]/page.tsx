import { notFound } from "next/navigation";
import { Card, CardHeader, StatTile } from "@/components/ui/Card";
import { GateConditionRow } from "@/components/ui/GateConditionRow";
import { getReleaseByCode } from "@/lib/data/product";
import { MarkReadyButton } from "./MarkReadyButton";

export default async function ReleaseDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const release = await getReleaseByCode(code.replace(/-/g, "."));
  if (!release) notFound();

  const openCriteria = release.criteria.filter((c) => c.status === "open").length;

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-5 max-w-[820px]">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="w-[34px] h-[3px] bg-coral rounded-[2px]" />
          <span className="font-mono text-[9.5px] text-muted">
            {release.productName}
            {release.targetDate ? ` · TARGET ${release.targetDate}` : ""}
          </span>
          <h1 className="m-0 font-display font-extrabold text-[20px] text-ink">Release {release.code}</h1>
        </div>
        <MarkReadyButton releaseId={release.id} releaseCode={release.code} disabled={openCriteria > 0} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatTile label="READINESS" value={`${release.readinessPct}%`} note={`${release.criteria.length - openCriteria} of ${release.criteria.length} criteria`} />
        <StatTile label="FEATURES" value={release.featureCount} />
        <StatTile
          label="PROJECTS AFFECTED"
          value={release.dependentProjects.length}
          accent={release.dependentProjects.length > 0}
        />
      </div>

      <Card>
        <CardHeader title="Exit criteria" note="SAME SHAPE AS A DELIVERY GATE" />
        <div className="px-4 py-3.5 flex flex-col gap-2.5">
          {release.criteria.length === 0 ? (
            <span className="text-[11.5px] text-muted">No exit criteria defined yet.</span>
          ) : (
            release.criteria.map((c, i) => (
              <GateConditionRow key={i} description={c.description} met={c.status !== "open"} note={c.metAt ?? (c.status === "open" ? "OPEN" : undefined)} />
            ))
          )}
        </div>
      </Card>

      {release.dependentProjects.length > 0 ? (
        <Card>
          <CardHeader title="Blast radius" note="WHO FEELS THIS SHIP" />
          <div className="flex flex-col">
            {release.dependentProjects.map((p, i) => (
              <div key={i} className="flex items-start gap-2.5 px-4 py-[11px] border-b border-line-soft last:border-b-0 text-[12px]">
                <span className="flex-1">{p.note ?? `${p.name} depends on this release.`}</span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
