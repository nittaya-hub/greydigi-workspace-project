"use client";

import { Button } from "@/components/ui/Button";

/** Builds a CSV client-side from already-fetched rows and triggers a
 * download via a temporary object-URL anchor. No server round-trip. */
export function ExportCsvButton({ rows, filename }: { rows: Record<string, string | number>[]; filename: string }) {
  const handleExport = () => {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const escape = (v: string | number) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="secondary" className="flex-none" onClick={handleExport} disabled={rows.length === 0}>
      Export
    </Button>
  );
}
