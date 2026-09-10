import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, EmptyState, PageHeading } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { TableHead, TableRow, CellStack } from "@/components/ui/Table";
import { getClientById } from "@/lib/data/clients";
import { getHypercareViewConfig, getHypercareReports } from "@/lib/data/hypercare-report";
import { HypercareViewFieldToggle } from "./HypercareViewFieldToggle";
import { PublishReportForm } from "./PublishReportForm";
import { RevokeReportButton } from "./RevokeReportButton";

const COLS = "150px 108px 78px 130px 90px";

// Deliberately its own page, not a tab bolted onto Delivery's Client view
// config — the explicit ask was to keep the two apart so nobody on the
// team mistakes one for the other. The three submission cards live only
// here now; Delivery's config no longer offers them.
const FIELD_LABELS: Record<string, { label: string; note: string }> = {
  services_summary: { label: "Services summary", note: "Health and live-since per service" },
  incidents_summary: { label: "Incidents", note: "Every incident opened within the report period" },
  sla_status: { label: "SLA targets", note: "Response target and update cadence per severity" },
  request_backlog: { label: "Request backlog", note: "Open support requests" },
  submissions_issue: { label: "Report an issue card", note: "Client can send an issue — category, severity, description" },
  submissions_change_request: { label: "Change request card", note: "Client can raise a change — business impact, priority" },
  submissions_question: { label: "Ask a question card", note: "General clarification and inquiry inbox" },
};
const DEFAULT_OFF_FIELDS = new Set(["submissions_issue", "submissions_change_request", "submissions_question"]);

export default async function HypercareReportConfigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getClientById(id);
  if (!client) notFound();

  const [config, reports] = await Promise.all([getHypercareViewConfig(id), getHypercareReports(id)]);

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-5 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-2 text-[11.5px] text-muted">
        <Link href={`/clients/${id}`} className="hover:text-ink">
          {client.name}
        </Link>
        <span>/</span>
        <span>Hypercare report settings</span>
      </div>
      <PageHeading
        title={`${client.name} — Hypercare report settings`}
        description="What a published weekly report can show, and the no-login links you've sent out so far. Separate from Delivery's Client view config on purpose."
      />

      <Card>
        <CardHeader title="Sections" note="WHAT THE REPORT SHOWS" />
        {Object.entries(FIELD_LABELS).map(([key, meta], i, arr) => {
          const on = DEFAULT_OFF_FIELDS.has(key) ? config.fields[key] === true : config.fields[key] !== false;
          return (
            <div
              key={key}
              className={`flex items-center gap-2.5 px-4 py-[11px] text-[12px] ${i < arr.length - 1 ? "border-b border-line-soft" : ""}`}
            >
              <span className="flex-1">
                <span className="block text-[12.5px] font-semibold text-ink">{meta.label}</span>
                <span className="block font-mono text-[9.5px] text-muted">{meta.note}</span>
              </span>
              <HypercareViewFieldToggle clientId={id} fieldKey={key} initialOn={on} />
            </div>
          );
        })}
      </Card>

      <Card className="p-4">
        <div className="mb-3">
          <span className="block text-[12.5px] font-semibold text-ink">Publish a report</span>
          <span className="block font-mono text-[9.5px] text-muted">
            PICK THE PERIOD IT COVERS — EACH PUBLISH IS ITS OWN LINK, EARLIER ONES KEEP WORKING
          </span>
        </div>
        <PublishReportForm clientId={id} />
      </Card>

      <Card>
        <CardHeader title="Sent so far" note={`${reports.length} REPORT${reports.length === 1 ? "" : "S"}`} />
        {reports.length === 0 ? (
          <EmptyState title="No reports published yet." description="Publish one above once there's something worth sharing." />
        ) : (
          <>
            <TableHead cols={COLS}>
              <span>PERIOD</span>
              <span>PUBLISHED</span>
              <span>STATUS</span>
              <span>BY</span>
              <span></span>
            </TableHead>
            {reports.map((r, i) => (
              <TableRow cols={COLS} key={r.id} last={i === reports.length - 1}>
                <CellStack primary={`${r.periodStart} → ${r.periodEnd}`} />
                <span className="font-mono text-[9.5px] text-muted">{r.publishedAt.slice(0, 10)}</span>
                <Pill tone={r.status === "revoked" ? "idle" : "done"} className="justify-self-start">
                  {r.status.toUpperCase()}
                </Pill>
                <span className="font-mono text-[9.5px] text-muted">{r.publishedByName}</span>
                {r.status === "active" ? <RevokeReportButton reportId={r.id} clientId={id} /> : <span />}
              </TableRow>
            ))}
          </>
        )}
      </Card>
    </div>
  );
}
