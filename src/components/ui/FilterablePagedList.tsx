"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import { EmptyState } from "@/components/ui/Card";

const PAGE_SIZE = 20;

export interface FilterPillDef<T> {
  key: string;
  label: string;
  predicate: (row: T) => boolean;
}

export interface RowHighlightProps {
  /** Pass as the row's own `<TableRow innerRef={...}>`. A no-op ref when
   * highlighting isn't wired up for this list (no getRowId given). */
  innerRef: (el: HTMLDivElement | null) => void;
  /** True for exactly the one row a `?<highlightParam>=<id>` link on
   * this page's URL pointed at, for a couple of seconds after arriving. */
  highlighted: boolean;
}

interface FilterablePagedListProps<T> {
  rows: T[];
  searchPlaceholder: string;
  /** Return true if `row` matches the lowercased `query`. */
  searchMatch: (row: T, query: string) => boolean;
  /** Category pills shown after "ALL <n>". Omit for a plain search-only list. */
  filters?: FilterPillDef<T>[];
  /** Which filter pill's key is selected on first render. Omit for the
   * usual "ALL" default -- pass one of `filters`' own keys when a list
   * is mostly interesting for one subset (e.g. ShareLinksTable: only
   * ever one row is "active" at a time, and showing every revoked link
   * from a project's whole history by default reads as clutter, not
   * an audit trail someone asked to see). */
  defaultFilterKey?: string;
  emptyTitle: string;
  emptyDescription: string;
  noMatchTitle?: string;
  noMatchDescription?: string;
  itemNounSingular: string;
  itemNounPlural: string;
  renderHead: () => ReactNode;
  /** `rowProps` is only meaningful when `highlightParam`/`getRowId` are
   * given: spread `rowProps.innerRef` onto the row's own TableRow (its
   * `innerRef` prop) and fold `rowProps.highlighted` into that row's
   * className (e.g. `clsx(..., rowProps.highlighted && "bg-coral-tint
   * transition-colors duration-700")`) to actually show the flash. */
  renderRow: (row: T, index: number, isLast: boolean, rowProps: RowHighlightProps) => ReactNode;
  /** Query param name (e.g. "document", "gate") that a link from
   * elsewhere in the app -- a dashboard widget, a decision queue, a
   * notification -- can carry to point at one specific row. When
   * present (together with getRowId), arriving with that param clears
   * any filter/search that would hide the row, jumps to its page,
   * scrolls it into view, and flashes it -- see hypercare/submissions'
   * ClientSubmissionsTable, which had this hand-rolled before it moved
   * here for every other filtered+paginated list to share. */
  highlightParam?: string;
  getRowId?: (row: T) => string;
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
 * component.
 *
 * Wrapped in its own Suspense boundary because reading the highlight
 * param needs useSearchParams(), which Next.js requires a Suspense
 * boundary around wherever a route might attempt a static/PPR shell —
 * true for some callers of this shared component even when they render
 * dynamically once deployed. The fallback is the exact same list with
 * highlighting simply not applied yet, not a skeleton, so there's
 * nothing to visibly flash before it resolves. */
export function FilterablePagedList<T>(props: FilterablePagedListProps<T>) {
  return (
    <Suspense fallback={<FilterablePagedListBody {...props} highlightId={null} />}>
      <FilterablePagedListWithParams {...props} />
    </Suspense>
  );
}

function FilterablePagedListWithParams<T>(props: FilterablePagedListProps<T>) {
  const searchParams = useSearchParams();
  const highlightId = props.highlightParam ? searchParams.get(props.highlightParam) : null;
  return <FilterablePagedListBody {...props} highlightId={highlightId} />;
}

function FilterablePagedListBody<T>({
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
  getRowId,
  highlightId,
  defaultFilterKey,
}: FilterablePagedListProps<T> & { highlightId: string | null }) {
  const [query, setQuery] = useState("");
  const [filterKey, setFilterKey] = useState(defaultFilterKey ?? "all");
  const [page, setPage] = useState(0);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [appliedHighlightId, setAppliedHighlightId] = useState<string | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());

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

  // Adjusted directly during render (React's own pattern for resetting
  // state when a prop changes, rather than in a useEffect -- avoids a
  // flash of the old filtered view and keeps a later revalidation
  // elsewhere on the page, which hands this component a new `rows`
  // reference, from resetting a search the person has since typed).
  // Index is computed against the unfiltered `rows` order, which is
  // exactly page 0's "all, no search" order this jumps to.
  if (highlightId && getRowId && highlightId !== appliedHighlightId) {
    const index = rows.findIndex((r) => getRowId(r) === highlightId);
    if (index !== -1) {
      setAppliedHighlightId(highlightId);
      setFilterKey("all");
      setQuery("");
      setPage(Math.floor(index / PAGE_SIZE));
      setHighlighted(highlightId);
    }
  }

  useEffect(() => {
    if (!highlighted) return;
    rowRefs.current.get(highlighted)?.scrollIntoView({ behavior: "smooth", block: "center" });
    const timeout = setTimeout(() => setHighlighted(null), 2600);
    return () => clearTimeout(timeout);
  }, [highlighted, page]);


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
            {/* A per-row ref callback, same shape as the innerRef
                ClientSubmissionsTable writes directly as a JSX
                attribute -- the only difference here is it's built one
                level removed, as an object handed to the caller's
                renderRow, which is enough indirection that eslint-
                plugin-react-hooks' newer `refs` rule can no longer see
                that the ref.current write only ever runs later, in
                React's own commit phase, and flags it as if it ran
                during render. It doesn't: a callback ref's body never
                executes until React actually attaches/detaches the DOM
                node. */}
            {/* eslint-disable-next-line react-hooks/refs */}
            {pageRows.map((row, i) => {
              const id = getRowId?.(row);
              const innerRef = id
                ? (el: HTMLDivElement | null) => {
                    if (el) rowRefs.current.set(id, el);
                    else rowRefs.current.delete(id);
                  }
                : () => {};
              return renderRow(row, i, i === pageRows.length - 1, {
                innerRef,
                highlighted: id != null && highlighted === id,
              });
            })}
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
