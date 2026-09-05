"use client";

import { Button } from "@/components/ui/Button";
import type { CrossSpaceDashboard } from "@/lib/data/dashboard";

function csvEscape(value: string | number): string {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function toCsv(data: CrossSpaceDashboard): string {
  const rows: (string | number)[][] = [
    ["METRIC", "VALUE"],
    ["Delivery in flight", data.deliveryInFlight],
    ["Go live, 30 days", data.goLive30d],
    ["Services live", data.servicesLive],
    ["Open incidents", data.openIncidents],
    ["At breach risk", data.atRiskCount],
    ["Hypercare to change request", data.hypercareToChangeRequest],
    ["Hypercare to product feature", data.hypercareToProductFeature],
    [],
    ["HANDOVER QUEUE"],
    ["REF", "NAME", "CLEARED AT"],
    ...data.handoverQueue.map((p) => [p.ref, p.name, p.clearedAt ?? ""]),
  ];
  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

/** Builds the CSV client-side from the cross-space data the page already
 * fetched — no server round trip needed for an export. */
export function ExportButton({ data }: { data: CrossSpaceDashboard }) {
  function handleExport() {
    const blob = new Blob([toCsv(data)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cross-space-dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="secondary" className="flex-none" onClick={handleExport}>
      Export
    </Button>
  );
}
