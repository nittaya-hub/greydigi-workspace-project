"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Card, EmptyState } from "@/components/ui/Card";
import { HealthPill } from "@/components/ui/Pill";
import { FlightPlanSpine } from "@/components/portal/FlightPlanSpine";

const PAGE_SIZE = 5;

type Phase = {
  code: string;
  name: string;
  index: number;
  started_at: string | null;
  completed_at: string | null;
  duration_label: string | null;
  show_duration_label: boolean;
};
type Gate = { code: string; name: string; sequence: number; status: string; target_date: string | null };

export interface FlightPlanRow {
  id: string;
  ref: string;
  name: string;
  clientName: string;
  health: string;
  phases: Phase[];
  gates: Gate[];
}

const HEALTH_FILTERS: { key: "all" | "on_plan" | "watch" | "blocked"; label: string }[] = [
  { key: "all", label: "ALL" },
  { key: "on_plan", label: "ON PLAN" },
  { key: "watch", label: "WATCH" },
  { key: "blocked", label: "BLOCKED" },
];

export function FlightPlansList({ rows }: { rows: FlightPlanRow[] }) {
  const [health, setHealth] = useState<(typeof HEALTH_FILTERS)[number]["key"]>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (health !== "all" && r.health !== health) return false;
      if (q && !`${r.ref} ${r.name} ${r.clientName}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, health, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  if (rows.length === 0) {
    return (
      <Card>
        <EmptyState title="No flight plans yet." description="A project clones a template's flight plan when it's created." />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex gap-1.5 flex-wrap">
          {HEALTH_FILTERS.map((f) => {
            const count = f.key === "all" ? rows.length : rows.filter((r) => r.health === f.key).length;
            const active = health === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => {
                  setHealth(f.key);
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
          placeholder="Filter by project or client..."
          className="ml-auto border border-line bg-white rounded-[8px] px-2.5 py-1.5 text-[12px] w-[220px] max-w-full"
        />
      </div>

      {pageRows.length === 0 ? (
        <Card>
          <EmptyState title="No flight plans match." description="Try a different health or project filter." />
        </Card>
      ) : (
        pageRows.map((p) => (
          <Card key={p.id} className="p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <Link href={`/delivery/projects/${p.ref.toLowerCase()}`} className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[13.5px] font-semibold text-ink truncate">{p.name}</span>
                <span className="font-mono text-[9.5px] text-muted">
                  {p.ref} · {p.clientName}
                </span>
              </Link>
              <HealthPill health={p.health} className="flex-none" />
            </div>
            {p.phases.length > 0 ? (
              <FlightPlanSpine phases={p.phases} gates={p.gates} dark={false} />
            ) : (
              <span className="text-[11.5px] text-muted">No phases on this flight plan yet.</span>
            )}
          </Card>
        ))
      )}

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
