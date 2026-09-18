import { PageHeading, Card, EmptyState } from "@/components/ui/Card";
import { TableHead, TableRow, CellStack } from "@/components/ui/Table";
import { getCurrentWorkspaceId } from "@/lib/data/workspace";
import { listCalibration } from "@/lib/data/manifest";

const COLS = "1fr 110px 130px 130px 90px";

/** Read-only, on purpose — every row here comes from the database
 * trigger on project_gates (0062_manifest.sql), never a form. Nothing
 * to create or edit; this page only shows what the write-back rule
 * already wrote. */
export default async function ManifestCalibrationPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const rows = workspaceId ? await listCalibration(workspaceId) : [];

  return (
    <div className="px-4 py-5 sm:px-7 sm:py-8 flex flex-col gap-5 max-w-[1400px] mx-auto">
      <PageHeading
        size="md"
        title="Calibration"
        description="Gate slip against its own target date, written automatically the moment every gate clears — planned vs. actual, never typed by hand."
      />

      <Card>
        {rows.length === 0 ? (
          <EmptyState title="No gate has cleared yet." description="The first row appears here the moment any mission clears its first gate." />
        ) : (
          <>
            <TableHead cols={COLS}>
              <span>MISSION</span>
              <span>GATE</span>
              <span>TARGET</span>
              <span>CLEARED</span>
              <span>SLIP</span>
            </TableHead>
            {rows.map((r, i) => (
              <TableRow cols={COLS} key={r.id} last={i === rows.length - 1}>
                <CellStack primary={r.projectRef} secondary={r.gateCode} />
                <span className="font-mono text-[10.5px] text-muted">{r.gateCode}</span>
                <span className="font-mono text-[10.5px] text-muted">{r.targetDate ? new Date(r.targetDate).toLocaleDateString() : "—"}</span>
                <span className="font-mono text-[10.5px] text-muted">{new Date(r.clearedAt).toLocaleDateString()}</span>
                <span className={`font-mono text-[11px] font-semibold ${r.slipDays !== null && r.slipDays > 0 ? "text-coral" : "text-ink"}`}>
                  {r.slipDays === null ? "—" : r.slipDays > 0 ? `+${r.slipDays}d` : `${r.slipDays}d`}
                </span>
              </TableRow>
            ))}
          </>
        )}
      </Card>
    </div>
  );
}
