import { PageHeading, Card, CardHeader } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { listRepeatPatterns } from "@/lib/data/hypercare";

export default async function HealthPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const patterns = workspaceId ? await listRepeatPatterns(workspaceId) : [];

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px] mx-auto">
      <PageHeading
        title="Health"
        description="Derived from open severity, SLA position and repeat rate. A service is never marked healthy by hand."
      />

      <Card>
        <CardHeader title="How health is computed" note="RULE" />
        <div className="px-4 py-3.5 flex flex-col gap-2 text-[11.5px] text-muted leading-[1.5]">
          <span>
            <strong className="text-ink">At risk</strong> any open sev1 incident.
          </span>
          <span>
            <strong className="text-ink">Watch</strong> any other open incident, or 3+ incidents opened in the
            last 90 days.
          </span>
          <span>
            <strong className="text-ink">Healthy</strong> neither of the above.
          </span>
        </div>
      </Card>

      <Card>
        <CardHeader title="Repeat patterns" note="CANDIDATES FOR THE ROADMAP" />
        {patterns.length === 0 ? (
          <div className="py-10 px-4 text-center text-[12.5px] text-muted">No repeat patterns flagged yet.</div>
        ) : (
          patterns.map((p, i) => (
            <div key={i} className={`flex items-center gap-2.5 px-4 py-[11px] text-[12px] ${i < patterns.length - 1 ? "border-b border-line-soft" : ""}`}>
              <span className="flex-1 flex flex-col gap-0.5">
                <span className="text-[12.5px] font-semibold text-ink">{p.incidentTitle}</span>
                <span className="font-mono text-[9.5px] text-muted">{p.incidentRef}</span>
              </span>
              <Pill tone={p.targetKind === "change_request" ? "waiting_on_client" : "in_progress"}>{p.targetLabel.toUpperCase()}</Pill>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
