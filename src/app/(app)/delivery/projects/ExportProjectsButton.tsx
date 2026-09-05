"use client";

import { Button } from "@/components/ui/Button";
import type { ProjectSummary } from "@/lib/data/delivery";

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function buildCsv(projects: ProjectSummary[]): string {
  const header = ["Ref", "Name", "Client", "Phase", "Next gate", "Health"];
  const rows = projects.map((p) => [
    p.ref,
    p.name,
    p.clientName,
    p.phaseCode ? `${p.phaseCode} ${p.phaseName ?? ""}`.trim() : "",
    p.nextGate ? `${p.nextGate.code}${p.nextGate.targetDate ? ` (${p.nextGate.targetDate})` : ""}` : "",
    p.health,
  ]);
  return [header, ...rows].map((row) => row.map((cell) => csvCell(String(cell))).join(",")).join("\n");
}

/** Builds the export CSV entirely client-side from the projects already
 * fetched for the page — no server round trip, just formatting data the
 * page already has. */
export function ExportProjectsButton({ projects, label = "Export" }: { projects: ProjectSummary[]; label?: string }) {
  return (
    <Button
      variant="secondary"
      onClick={() => {
        const csv = buildCsv(projects);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `projects-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }}
    >
      {label}
    </Button>
  );
}
