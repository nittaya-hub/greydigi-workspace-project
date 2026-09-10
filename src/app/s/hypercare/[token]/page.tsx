import Image from "next/image";
import { Card, StatTile } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { getPublicHypercareReportView, type HypercareReportData } from "@/lib/data/hypercare-report";
import { PublicSubmissionForm } from "@/components/portal/PublicSubmissionForm";
import { submitPublicHypercareSubmission } from "./submit-actions";

// Same conventions as the internal Hypercare pages (services/page.tsx,
// incidents/page.tsx, services/[ref]/page.tsx) — sev1/sev2/sev3 and
// healthy/watch/at_risk are the real enum values, not p1/p2/p3 or
// "degraded", which don't exist in incident_severity or service_health.
const SEVERITY_LABEL: Record<string, string> = { sev1: "P1", sev2: "P2", sev3: "P3" };
const SEVERITY_TONE: Record<string, "blocked" | "in_progress" | "idle"> = { sev1: "blocked", sev2: "in_progress", sev3: "idle" };
const HEALTH_TONE: Record<string, "blocked" | "watch" | "done"> = { at_risk: "blocked", watch: "watch", healthy: "done" };
const HEALTH_LABEL: Record<string, string> = { at_risk: "AT RISK", watch: "WATCH", healthy: "HEALTHY" };

export default async function PublicHypercareReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await getPublicHypercareReportView(token);

  return (
    <div className="min-h-dvh bg-paper flex flex-col">
      <header className="flex items-center gap-3 px-4 sm:px-6 py-3.5 border-b border-line bg-paper/90">
        <Image src="/greydigi-logo.png" alt="greydigi" width={22} height={22} className="rounded-[6px]" />
        <span className="font-display font-extrabold text-[14px]">greydigi</span>
        <span className="flex-1" />
        {result.state === "valid" ? (
          <Pill tone="idle" className="hidden sm:inline-flex">
            HYPERCARE REPORT · NO LOGIN REQUIRED
          </Pill>
        ) : null}
      </header>

      <main className="flex-1 px-4 sm:px-6 py-7 sm:py-9 max-w-[820px] w-full mx-auto flex flex-col gap-5">
        {result.state === "valid" ? <ValidView data={result.data} publishedAt={result.published_at} token={token} /> : null}
        {result.state === "revoked" ? (
          <StateCard title="Report link revoked" body="This link has been revoked. Ask your greydigi contact for a new one." />
        ) : null}
        {result.state === "invalid" ? (
          <StateCard title="Link not found" body="This link doesn't exist, or was never created. Check the URL and try again." />
        ) : null}
      </main>

      <footer className="text-center py-6">
        <span className="font-mono text-[9.5px] text-muted">
          Shared by greydigi · not affiliated with your account · this link can be revoked at any time by its owner
        </span>
      </footer>
    </div>
  );
}

function StateCard({ title, body }: { title: string; body: string }) {
  return (
    <Card className="p-8 flex flex-col items-center gap-2 text-center">
      <span className="font-display font-extrabold text-[16px] text-ink">{title}</span>
      <span className="text-[11.5px] text-muted max-w-[46ch]">{body}</span>
    </Card>
  );
}

function ValidView({
  data,
  publishedAt,
  token,
}: {
  data: HypercareReportData;
  publishedAt: string;
  token: string;
}) {
  const openIncidents = (data.incidents ?? []).filter((i) => i.status !== "resolved");
  const breached = (data.incidents ?? []).filter((i) => i.breach_at && new Date(i.breach_at) < new Date() && i.status !== "resolved");
  const anySubmissionEnabled = data.submissions.issue || data.submissions.change_request || data.submissions.question;

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <span className="w-[34px] h-[3px] bg-coral rounded-[2px]" />
        <h1 className="m-0 font-display font-extrabold text-[22px] text-ink">{data.client_name} — Hypercare report</h1>
        <p className="m-0 text-[12.5px] text-muted">
          {data.period_start} to {data.period_end}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="OPEN INCIDENTS" value={openIncidents.length} accent={openIncidents.length > 0} />
        <StatTile label="SLA BREACHED" value={breached.length} accent={breached.length > 0} />
        <StatTile label="SERVICES" value={data.services?.length ?? 0} />
        <StatTile label="REQUEST BACKLOG" value={data.request_backlog?.length ?? 0} />
      </div>

      {data.services && data.services.length > 0 ? (
        <Card>
          <div className="px-4 py-3.5 border-b border-line font-display font-extrabold text-[13.5px]">Services</div>
          <div className="px-4 py-3.5 flex flex-col gap-2.5">
            {data.services.map((s) => (
              <div key={s.ref} className="flex justify-between text-[12.5px]">
                <span className="font-semibold text-ink">{s.name}</span>
                <Pill tone={HEALTH_TONE[s.health] ?? "idle"}>{HEALTH_LABEL[s.health] ?? s.health.toUpperCase()}</Pill>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {data.incidents && data.incidents.length > 0 ? (
        <Card>
          <div className="px-4 py-3.5 border-b border-line font-display font-extrabold text-[13.5px]">Incidents this period</div>
          <div className="px-4 py-3.5 flex flex-col gap-2.5">
            {data.incidents.map((i) => (
              <div key={i.ref} className="flex justify-between text-[12.5px] gap-2">
                <span className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-semibold text-ink truncate">{i.title}</span>
                  <span className="font-mono text-[9.5px] text-muted">{i.ref} · opened {i.opened_at.slice(0, 10)}</span>
                </span>
                <span className="flex items-center gap-1.5 flex-none">
                  <Pill tone={SEVERITY_TONE[i.severity] ?? "idle"}>{SEVERITY_LABEL[i.severity] ?? i.severity.toUpperCase()}</Pill>
                  <Pill tone={i.status === "resolved" ? "done" : "in_progress"}>{i.status.toUpperCase()}</Pill>
                </span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {data.sla_tiers && data.sla_tiers.length > 0 ? (
        <Card>
          <div className="px-4 py-3.5 border-b border-line font-display font-extrabold text-[13.5px]">SLA targets</div>
          <div className="px-4 py-3.5 flex flex-col gap-2.5">
            {data.sla_tiers.map((t, i) => (
              <div key={i} className="flex justify-between text-[12.5px]">
                <span className="text-ink">{t.service_ref} · {SEVERITY_LABEL[t.severity] ?? t.severity.toUpperCase()}</span>
                <span className="font-mono text-[9.5px] text-muted">Response within {t.response_target_minutes} min</span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {data.request_backlog && data.request_backlog.length > 0 ? (
        <Card>
          <div className="px-4 py-3.5 border-b border-line font-display font-extrabold text-[13.5px]">Open requests</div>
          <div className="px-4 py-3.5 flex flex-col gap-2.5">
            {data.request_backlog.map((r) => (
              <div key={r.ref} className="flex justify-between text-[12.5px]">
                <span className="text-ink">{r.title}</span>
                <span className="font-mono text-[9.5px] text-muted">{r.status.toUpperCase()}</span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {anySubmissionEnabled ? (
        <Card>
          <div className="px-4 py-3.5 border-b border-line flex items-center justify-between">
            <span className="font-display font-extrabold text-[13.5px]">Need something?</span>
            <Pill tone="idle">NO LOGIN NEEDED</Pill>
          </div>
          <div className="px-4 py-3.5 flex flex-col gap-2.5">
            <p className="m-0 text-[11.5px] text-muted leading-[1.5]">
              Something wrong, something you want changed, or just a question — send it directly and the team is notified right away.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {data.submissions.issue ? (
                <PublicSubmissionForm
                  token={token}
                  kind="issue"
                  categoryOptions={data.submission_options.issue.category}
                  severityOptions={data.submission_options.issue.severity}
                  submitAction={submitPublicHypercareSubmission}
                />
              ) : null}
              {data.submissions.change_request ? (
                <PublicSubmissionForm
                  token={token}
                  kind="change_request"
                  priorityOptions={data.submission_options.change_request.priority}
                  submitAction={submitPublicHypercareSubmission}
                />
              ) : null}
              {data.submissions.question ? (
                <PublicSubmissionForm token={token} kind="question" submitAction={submitPublicHypercareSubmission} />
              ) : null}
            </div>
          </div>
        </Card>
      ) : null}

      <div className="text-center pt-1.5">
        <span className="font-mono text-[9.5px] text-muted">Published {new Date(publishedAt).toLocaleDateString()}</span>
      </div>
    </>
  );
}
