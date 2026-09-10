"use client";

import { useMemo, useState, type ReactNode } from "react";
import clsx from "clsx";
import { EmptyState } from "@/components/ui/Card";

const PAGE_SIZE = 20;

export interface FilterPillDef<T> {
  key: string;
  label: string;
  predicate: (row: T) => boolean;
}

/** Shared shell for every "search + filter pills + 20-per-page
 * pagination" list in the app (first built independently three times —
 * DocumentsTable.tsx, NotificationsBoard.tsx, ClientSubmissionsTable.tsx
 * — before it was clear the same shape would be needed a dozen more
 * times across the rest of the app). Callers own the actual row markup
 * (renderHead/renderRow) since columns differ per list; this owns only
 * the search/filter/page state and the surrounding chrome. Rows are
 * expected to already arrive newest-first from the server query --
 * this component filters and paginates but never re-sorts, so "page 1
 * shows the latest" is a property of the caller's query, not of this
 * component. */
export function FilterablePagedList<T>({
  rows,
  searchPlaceholder,
  searchMatch,
  filters,
  emptyTitle,
  emptyDescription,
  noMatchTitle,
  noMatchDescription,
  itemNounSingular,
  itemNounPlural,
  renderHead,
  renderRow,
}: {
  rows: T[];
  searchPlaceholder: string;
  /** Return true if `row` matches the lowercased `query`. */
  searchMatch: (row: T, query: string) => boolean;
  /** Category pills shown after "ALL <n>". Omit for a plain search-only list. */
  filters?: FilterPillDef<T>[];
  emptyTitle: string;
  emptyDescription: string;
  noMatchTitle?: string;
  noMatchDescription?: string;
  itemNounSingular: string;
  itemNounPlural: string;
  renderHead: () => ReactNode;
  renderRow: (row: T, index: number, isLast: boolean) => ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [filterKey, setFilterKey] = useState("all");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const activeFilter = filters?.find((f) => f.key === filterKey);
    return rows.filter((r) => {
      if (activeFilter && !activeFilter.predicate(r)) return false;
      if (!q) return true;
      return searchMatch(r, q);
    });
  }, [rows, query, filterKey, filters, searchMatch]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  function setFilterAndResetPage(next: string) {
    setFilterKey(next);
    setPage(0);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <svg
            viewBox="0 0 20 20"
            fill="none"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none"
          >
            <circle cx="8.5" cy="8.5" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M13 13L17.5 17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder={searchPlaceholder}
            className="w-full rounded-full border border-line bg-white pl-8 pr-3 py-1.5 text-[12px] text-ink placeholder:text-muted-2 focus:outline-none focus:border-coral"
          />
        </div>
        {filters && filters.length > 0 ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setFilterAndResetPage("all")}
              className={clsx(
                "font-mono text-[9px] tracking-[.06em] rounded-[5px] px-[7px] py-[3px]",
                filterKey === "all" ? "bg-ink text-white" : "border border-line text-coral"
              )}
            >
              ALL {rows.length}
            </button>
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilterAndResetPage(f.key)}
                className={clsx(
                  "font-mono text-[9px] tracking-[.06em] rounded-[5px] px-[7px] py-[3px]",
                  filterKey === f.key ? "bg-ink text-white" : "border border-line text-coral"
                )}
              >
                {f.label.toUpperCase()} {rows.filter(f.predicate).length}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="bg-white border border-line rounded-[12px] overflow-hidden">
        {pageRows.length === 0 ? (
          <EmptyState
            title={rows.length === 0 ? emptyTitle : noMatchTitle ?? "Nothing matches this search."}
            description={rows.length === 0 ? emptyDescription : noMatchDescription ?? "Try a different search or filter."}
          />
        ) : (
          <>
            {renderHead()}
            {pageRows.map((row, i) => renderRow(row, i, i === pageRows.length - 1))}
          </>
        )}
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9.5px] text-muted">
            PAGE {currentPage + 1} OF {totalPages} · {filtered.length} {filtered.length === 1 ? itemNounSingular : itemNounPlural}
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
