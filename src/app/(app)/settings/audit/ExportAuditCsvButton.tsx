"use client";

import { Button } from "@/components/ui/Button";

type AuditRow = { id: string; createdAt: string; summary: string; actorName: string; entityType: string };

function toCsvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function ExportAuditCsvButton({ rows }: { rows: AuditRow[] }) {
  return (
    <Button
      variant="secondary"
      className="flex-none"
      onClick={() => {
        const header = ["Time", "Summary", "Actor", "Record type"].join(",");
        const lines = rows.map((r) =>
          [toCsvCell(new Date(r.createdAt).toISOString()), toCsvCell(r.summary), toCsvCell(r.actorName), toCsvCell(r.entityType)].join(",")
        );
        const csv = [header, ...lines].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }}
    >
      Export CSV
    </Button>
  );
}
