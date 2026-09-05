"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Card, EmptyState } from "@/components/ui/Card";
import { GateStatusPill } from "@/components/ui/Pill";
import { TableHead, TableRow } from "@/components/ui/Table";

const COLS = "48px 1fr 88px 96px";
const PAGE_SIZE = 20;

export interface GateTableRow {
  id: string;
  code: string;
  status: string;
  met: number;
  total: number;
  /** held_since ?? cleared_at ?? target_date — the closest thing a gate has
   * to an activity date, since project_gates has no created_at/updated_at.
   * Used to sort newest-first; gates with none of the three sort last. */
  recency: string | null;
  projectRef: string | null;
  projectName: string | null;
}

const STATUS_FILTERS: { key: "all" | "held" | "on_plan" | "cleared"; label: string }[] = [
  { key: "all", label: "ALL" },
  { key: "held", label: "BLOCKED" },
  { key: "on_plan", label: "ON PLAN" },
  { key: "cleared", label: "CLEARED" },
];

export function GatesTable({ rows }: { rows: GateTableRow[] }) {
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]["key"]>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => [...rows].sort((a, b) => (b.recency ?? "").localeCompare(a.recency ?? "")), [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sorted.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (q && !`${r.projectRef ?? ""} ${r.projectName ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [sorted, status, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  if (rows.length === 0) {
    return (
      <Card>
        <EmptyState title="No gates yet." description="Gates appear once a project clones a flight plan." />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map((f) => {
            const count = f.key === "all" ? rows.length : rows.filter((r) => r.status === f.key).length;
            const active = status === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => {
                  setStatus(f.key);
                  setPage(1);
                }}
                className={clsx(
                  "font-mono text-[9px] tracking-[.06em] rounded-[5px] px-[7px] py-[3px]",
                  active ? "bg-ink text-white" : "border border-line text-coral hover:bg-coral/5"
                )}
              >
                {f.label} {count}
              </button>
            );
          })}
        </div>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder="Filter by project..."
          className="ml-auto border border-line bg-white rounded-[8px] px-2.5 py-1.5 text-[12px] w-[200px] max-w-full"
        />
      </div>

      <Card>
        {pageRows.length === 0 ? (
          <EmptyState title="No gates match." description="Try a different status or project filter." />
        ) : (
          <>
            <TableHead cols={COLS}>
              <span>GATE</span>
              <span>PROJECT</span>
              <span>MET</span>
              <span>STATUS</span>
            </TableHead>
            {pageRows.map((g, i) => (
              <TableRow cols={COLS} key={g.id} last={i === pageRows.length - 1}>
                <span className="font-mono text-[9.5px] text-muted">{g.code}</span>
                {g.projectRef ? (
                  <Link href={`/delivery/projects/${g.projectRef.toLowerCase()}`} className="text-[12.5px] font-semibold text-ink truncate">
                    {g.projectRef} {g.projectName}
                  </Link>
                ) : (
                  <span className="text-muted">—</span>
                )}
                <span className="font-mono text-[9.5px] text-muted">
                  {g.met} / {g.total}
                </span>
                <GateStatusPill status={g.status} className="justify-self-start" />
              </TableRow>
            ))}
          </>
        )}
      </Card>

      {filtered.length > 0 ? (
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9.5px] text-muted">
            {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} OF {filtered.length}
          </span>
          <div className="flex gap-1.5">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="font-mono text-[9.5px] tracking-[.06em] rounded-[6px] border border-line px-2.5 py-1.5 text-muted hover:text-ink hover:border-ink disabled:pointer-events-none disabled:opacity-40"
            >
              PREV
            </button>
            <button
              type="button"
              disabled={safePage >= pageCount}
              onClick={() => setPage((p) => p + 1)}
              className="font-mono text-[9.5px] tracking-[.06em] rounded-[6px] border border-line px-2.5 py-1.5 text-muted hover:text-ink hover:border-ink disabled:pointer-events-none disabled:opacity-40"
            >
              NEXT
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
