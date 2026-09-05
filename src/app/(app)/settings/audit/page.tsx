import { PageHeading, Card } from "@/components/ui/Card";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { listAuditLog } from "@/lib/data/admin";
import { ExportAuditCsvButton } from "./ExportAuditCsvButton";

export default async function AuditLogPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const rows = workspaceId ? await listAuditLog(workspaceId) : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <PageHeading title="Audit log" description="Append only. Actor, time, record and reason on every row." />
        <ExportAuditCsvButton rows={rows} />
      </div>

      <Card>
        {rows.length === 0 ? (
          <div className="py-10 px-4 text-center text-[12.5px] text-muted">No activity recorded yet.</div>
        ) : (
          rows.map((r, i) => (
            <div key={r.id} className={`grid grid-cols-[110px_1fr] gap-2.5 px-4 py-[11px] text-[12px] ${i < rows.length - 1 ? "border-b border-line-soft" : ""}`}>
              <span className="font-mono text-[9.5px] text-muted">
                {new Date(r.createdAt).toLocaleDateString()} {new Date(r.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-[12.5px] font-semibold text-ink">{r.summary}</span>
                <span className="font-mono text-[9.5px] text-muted">
                  {r.actorName.toUpperCase()} · {r.entityType.toUpperCase()}
                </span>
              </span>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
