import { PageHeading } from "@/components/ui/Card";
import { AdminOnlyNotice } from "@/components/ui/AdminOnlyNotice";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { getCurrentPerson } from "@/lib/data/auth-guard";
import { listAuditLog } from "@/lib/data/admin";
import { ExportAuditCsvButton } from "./ExportAuditCsvButton";
import { ExportPdfButton } from "@/components/pdf/ExportPdfButton";
import { AuditLogTable } from "./AuditLogTable";

export default async function AuditLogPage() {
  const viewer = await getCurrentPerson();
  if (viewer?.workspace_role !== "workspace_admin") return <AdminOnlyNotice title="Audit log" />;

  const workspaceId = await getCurrentWorkspaceId();
  const rows = workspaceId ? await listAuditLog(workspaceId) : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <PageHeading title="Audit log" description="Append only. Actor, time, record and reason on every row. Newest first." />
        <div className="flex gap-1.5 flex-none">
          <ExportAuditCsvButton rows={rows} />
          <ExportPdfButton href="/settings/audit/pdf" fallbackFilename={`audit-log-${new Date().toISOString().slice(0, 10)}.pdf`} />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white border border-line rounded-[12px] py-10 px-4 text-center text-[12.5px] text-muted">
          No activity recorded yet.
        </div>
      ) : (
        <AuditLogTable rows={rows} />
      )}
    </div>
  );
}
