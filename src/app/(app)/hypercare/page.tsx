import Link from "next/link";
import { PageHeading, Card, CardHeader, StatTile, HeroPanel, Eyebrow } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { getHypercareOverview, formatDuration, minutesUntil, listServices, SUBMISSION_KIND_LABEL } from "@/lib/data/hypercare";
import { getSelectedClientId, getSelectedClientHypercareEnabled } from "@/lib/data/client-scope";
import { ExportCsvButton } from "./ExportCsvButton";
import { LogIncidentButton } from "./incidents/LogIncidentButton";
import { ExportPdfButton } from "@/components/pdf/ExportPdfButton";

const HEALTH_TONE: Record<string, "blocked" | "watch" | "in_progress" | "done"> = {
  at_risk: "blocked",
  watch: "watch",
  healthy: "done",
};
const HEALTH_LABEL: Record<string, string> = { at_risk: "BREACH RISK", watch: "WATCH", healthy: "HEALTHY" };

export default async function HypercareOverviewPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px] mx-auto">
        <PageHeading title="Hypercare" description="Live client systems after go-live." />
        <Card className="p-5">
          <p className="text-[12.5px] text-muted">Not signed in, or this workspace has no data yet.</p>
        </Card>
      </div>
    );
  }

  const clientId = await getSelectedClientId();
  const hypercareEnabled = await getSelectedClientHypercareEnabled();

  if (hypercareEnabled === false) {
    return (
      <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px] mx-auto">
        <PageHeading title="Hypercare" description="Live client systems after go-live." />
        <Card className="p-8 flex flex-col items-center text-center gap-2">
          <Eyebrow>NOT ENABLED FOR THIS CLIENT</Eyebrow>
          <p className="text-[13px] text-ink font-semibold">HyperCare isn&apos;t enabled for this client.</p>
          <p className="text-[12px] text-muted max-w-[42ch]">
            This client hasn&apos;t purchased HyperCare, or it was turned off. A workspace admin can enable it from
            the client&apos;s page.
          </p>
        </Card>
      </div>
    );
  }

  const overview = await getHypercareOverview(workspaceId, clientId);
  const breach = overview.closestToBreach;
  const breachMinutes = breach?.breachAt ? minutesUntil(breach.breachAt) : null;
  const services = await listServices(workspaceId, clientId);

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <PageHeading
          title="Hypercare"
          description="Live client systems after go-live. One SLA policy per service, incidents and requests against them."
        />
        <div className="flex gap-1.5 flex-none">
          <ExportCsvButton
            rows={overview.serviceHealth.map((s) => ({ ref: s.ref, name: s.name, health: s.health, note: s.note }))}
            filename="hypercare-service-health.csv"
          />
          <ExportPdfButton href="/hypercare/pdf" fallbackFilename={`hypercare-service-health-${new Date().toISOString().slice(0, 10)}.pdf`} />
          <LogIncidentButton services={services.map((s) => ({ id: s.id, ref: s.ref, name: s.name }))} />
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-4 items-stretch">
        {breach ? (
          <HeroPanel>
            <Eyebrow className="text-muted-2">CLOSEST TO BREACH</Eyebrow>
            <span className="font-display font-extrabold text-[23px] leading-[1.15]">
              {breach.ref} {breach.title}
            </span>
            <span className="text-[12.5px] text-muted-2">{breach.serviceName}</span>
            {breachMinutes != null ? (
              <div className="flex gap-1 mt-0.5">
                <span className="flex-[5] h-1.5 rounded-[3px] bg-[#7A828F]" />
                <span className="flex-1 h-1.5 rounded-[3px] bg-coral" />
              </div>
            ) : null}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3.5 border-t border-white/10">
              <Field label="SEVERITY" value={breach.severity.toUpperCase()} accent />
              <Field label="BREACH IN" value={breachMinutes != null ? formatDuration(breachMinutes) : "—"} accent />
              <Field label="SERVICE" value={breach.serviceName} />
              <Field label="REF" value={breach.clientProject} />
            </div>
          </HeroPanel>
        ) : overview.untriagedSubmissionCount > 0 ? (
          <Card>
            <CardHeader title="Untriaged client submissions" note={String(overview.untriagedSubmissionCount)} />
            {overview.latestUntriagedSubmissions.map((s, i) => (
              <Link
                key={s.id}
                href={`/hypercare/submissions?submission=${s.id}`}
                className={`flex items-center justify-between gap-3 px-4 py-[11px] text-[12px] hover:bg-canvas ${
                  i < overview.latestUntriagedSubmissions.length - 1 ? "border-b border-line-soft" : ""
                }`}
              >
                <span className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[12.5px] font-semibold text-ink truncate">{s.title}</span>
                  <span className="font-mono text-[9.5px] text-muted">
                    {(SUBMISSION_KIND_LABEL[s.kind] ?? s.kind).toUpperCase()} · {s.clientName}
                  </span>
                </span>
                <Pill tone={s.kind === "issue" ? "blocked" : s.kind === "change_request" ? "watch" : "idle"} className="flex-none">
                  {(SUBMISSION_KIND_LABEL[s.kind] ?? s.kind).toUpperCase()}
                </Pill>
              </Link>
            ))}
          </Card>
        ) : (
          <Card>
            <div className="py-10 px-4 text-center text-[12.5px] text-muted">No open incidents. All services within SLA.</div>
          </Card>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
          <StatTile label="ACTIVE INCIDENTS" value={overview.activeIncidents} note={`${overview.sev1Count} sev1, ${overview.sev3Count} sev3`} accent={overview.activeIncidents > 0} />
          <StatTile label="SLA AT RISK" value={overview.slaAtRisk} note="Within 6h of target" accent={overview.slaAtRisk > 0} />
          <StatTile
            label="UNTRIAGED SUBMISSIONS"
            value={overview.untriagedSubmissionCount}
            note="Report an issue / change request / question"
            accent={overview.untriagedSubmissionCount > 0}
          />
          <StatTile label="SERVICES LIVE" value={overview.servicesLive} note={`Across ${overview.clientCount} clients`} />
          <StatTile label="REQUEST BACKLOG" value={overview.requestBacklog} />
        </div>
      </div>

      <Card>
        <CardHeader title="Service health" note="DERIVED, NEVER TYPED" />
        {overview.serviceHealth.length === 0 ? (
          <div className="py-10 px-4 text-center text-[12.5px] text-muted">No live services yet.</div>
        ) : (
          overview.serviceHealth.map((s, i) => (
            <div
              key={s.ref}
              className={`flex items-center gap-2.5 px-4 py-[11px] text-[12px] ${i < overview.serviceHealth.length - 1 ? "border-b border-line-soft" : ""}`}
            >
              <span className="flex-1 flex flex-col gap-0.5">
                <span className="text-[12.5px] font-semibold text-ink">{s.name}</span>
                <span className="font-mono text-[9.5px] text-muted">
                  {s.ref} · {s.note}
                </span>
              </span>
              <Pill tone={HEALTH_TONE[s.health]}>{HEALTH_LABEL[s.health]}</Pill>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

function Field({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <span className="flex flex-col gap-1">
      <Eyebrow className="text-muted-2">{label}</Eyebrow>
      <span className={`text-[13px] font-semibold ${accent ? "text-coral" : ""}`}>{value}</span>
    </span>
  );
}
