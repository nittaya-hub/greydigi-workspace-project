"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import type { AuditRow } from "@/lib/data/admin";

const PAGE_SIZE = 20;

/** Client-side filter (by entity type) + pagination at 20 rows/page —
 * rows already arrive newest-first from listAuditLog, so page 1 always
 * shows the most recent activity regardless of filter. */
export function AuditLogTable({ rows }: { rows: AuditRow[] }) {
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [page, setPage] = useState(0);

  const entityTypes = useMemo(() => [...new Set(rows.map((r) => r.entityType))].sort(), [rows]);
  const filtered = entityFilter === "all" ? rows : rows.filter((r) => r.entityType === entityFilter);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  function setFilterAndResetPage(next: string) {
    setEntityFilter(next);
    setPage(0);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={() => setFilterAndResetPage("all")}
          className={clsx(
            "font-mono text-[9px] tracking-[.06em] rounded-[5px] px-[7px] py-[3px]",
            entityFilter === "all" ? "bg-ink text-white" : "border border-line text-coral"
          )}
        >
          ALL {rows.length}
        </button>
        {entityTypes.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setFilterAndResetPage(type)}
            className={clsx(
              "font-mono text-[9px] tracking-[.06em] rounded-[5px] px-[7px] py-[3px]",
              entityFilter === type ? "bg-ink text-white" : "border border-line text-coral"
            )}
          >
            {type.toUpperCase()} {rows.filter((r) => r.entityType === type).length}
          </button>
        ))}
      </div>

      <div className="bg-white border border-line rounded-[12px] overflow-hidden">
        {pageRows.length === 0 ? (
          <div className="py-10 px-4 text-center text-[12.5px] text-muted">No activity matches this filter.</div>
        ) : (
          pageRows.map((r, i) => (
            <div
              key={r.id}
              className={clsx(
                "grid grid-cols-[110px_1fr] gap-2.5 px-4 py-[11px] text-[12px]",
                i < pageRows.length - 1 && "border-b border-line-soft"
              )}
            >
              <span className="font-mono text-[9.5px] text-muted">
                {new Date(r.createdAt).toLocaleDateString()}{" "}
                {new Date(r.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9.5px] text-muted">
            PAGE {currentPage + 1} OF {totalPages}
          </span>
          <div className="flex gap-1.5">
            <button
              type="button"
              disabled={currentPage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="font-mono text-[9.5px] text-muted hover:text-ink disabled:opacity-40 border border-line rounded-[6px] px-2.5 py-1"
            >
              PREV
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="font-mono text-[9.5px] text-muted hover:text-ink disabled:opacity-40 border border-line rounded-[6px] px-2.5 py-1"
            >
              NEXT
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
