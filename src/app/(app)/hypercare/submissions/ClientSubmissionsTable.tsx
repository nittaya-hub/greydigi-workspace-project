"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import { EmptyState } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { TableHead, TableRow, CellStack } from "@/components/ui/Table";
import type { ClientSubmissionRow } from "@/lib/data/client-submissions";
import type { WorkspacePersonOption } from "@/lib/data/project";
import { SubmissionStatusSelect } from "./SubmissionStatusSelect";
import { SubmissionAssigneeSelect } from "./SubmissionAssigneeSelect";
import { SubmissionDetailButton } from "./SubmissionDetailButton";

const COLS = "128px 1fr 96px 110px 56px 118px";
const PAGE_SIZE = 20;

const KIND_LABEL: Record<string, string> = {
  issue: "REPORT AN ISSUE",
  change_request: "CHANGE REQUEST",
  question: "QUESTION",
};

function ageDays(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

/** Search box + kind filter pills (Report an issue / Change request /
 * Question) + 20-per-page pagination — same shape as DocumentsTable.
 * The KIND column used to be 90px, too narrow for "REPORT AN ISSUE" at
 * this font; Pill's own whitespace-nowrap doesn't wrap or truncate, so
 * the label just kept going and visually sat on top of the SUBMISSION
 * column next to it. Widened the column instead of shrinking the text,
 * since the pill is the one thing in this row that should stay readable
 * at a glance. */
export function ClientSubmissionsTable({ submissions, people }: { submissions: ClientSubmissionRow[]; people: WorkspacePersonOption[] }) {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("submission");

  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [appliedHighlightId, setAppliedHighlightId] = useState<string | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());

  const kinds = useMemo(() => [...new Set(submissions.map((s) => s.kind))].sort(), [submissions]);

  // A notification or task link can carry ?submission=<id> to point at
  // one specific row -- with search + a kind filter + 20-per-page
  // pagination on this list, the row that link was about could easily
  // be filtered out or several pages away, which is exactly what made
  // it un-findable before this. Adjusted directly during render (React's
  // own pattern for resetting state when a prop changes: https://
  // react.dev/learn/you-might-not-need-an-effect) rather than in a
  // useEffect, so there's no flash of the old filtered view first, and
  // so a later action elsewhere on the page revalidating the route --
  // which hands this component a new `submissions` array reference --
  // doesn't reset the search/filter the person has since changed;
  // `appliedHighlightId` only re-triggers this for a genuinely new id.
  if (highlightId && highlightId !== appliedHighlightId) {
    const index = submissions.findIndex((s) => s.id === highlightId);
    if (index !== -1) {
      setAppliedHighlightId(highlightId);
      setKindFilter("all");
      setQuery("");
      setPage(Math.floor(index / PAGE_SIZE));
      setHighlighted(highlightId);
    }
  }

  // Scrolling the target row into view is a real external-system effect
  // (the DOM), and clearing the flash after a delay is subscribing to an
  // external timer, calling setState from *its* callback -- both the
  // legitimate use of an effect, unlike the state adjustment above.
  useEffect(() => {
    if (!highlighted) return;
    rowRefs.current.get(highlighted)?.scrollIntoView({ behavior: "smooth", block: "center" });
    const timeout = setTimeout(() => setHighlighted(null), 2600);
    return () => clearTimeout(timeout);
  }, [highlighted, page]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return submissions.filter((s) => {
      if (kindFilter !== "all" && s.kind !== kindFilter) return false;
      if (!q) return true;
      return s.title.toLowerCase().includes(q) || s.clientName.toLowerCase().includes(q);
    });
  }, [submissions, query, kindFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  function setKindAndResetPage(next: string) {
    setKindFilter(next);
    setPage(0);
  }

  if (submissions.length === 0) {
    return (
      <EmptyState
        title="No submissions yet."
        description="Clients can report an issue, raise a change request, or ask a question from their portal at any time."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <svg viewBox="0 0 20 20" fill="none" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none">
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
            placeholder="Search by title or client..."
            className="w-full rounded-full border border-line bg-white pl-8 pr-3 py-1.5 text-[12px] text-ink placeholder:text-muted-2 focus:outline-none focus:border-coral"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setKindAndResetPage("all")}
            className={clsx(
              "font-mono text-[9px] tracking-[.06em] rounded-[5px] px-[7px] py-[3px]",
              kindFilter === "all" ? "bg-ink text-white" : "border border-line text-coral"
            )}
          >
            ALL {submissions.length}
          </button>
          {kinds.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKindAndResetPage(k)}
              className={clsx(
                "font-mono text-[9px] tracking-[.06em] rounded-[5px] px-[7px] py-[3px]",
                kindFilter === k ? "bg-ink text-white" : "border border-line text-coral"
              )}
            >
              {(KIND_LABEL[k] ?? k.toUpperCase())} {submissions.filter((s) => s.kind === k).length}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-line rounded-[12px] overflow-hidden">
        {pageRows.length === 0 ? (
          <EmptyState title="No submissions match this search." description="Try a different name, kind or filter." />
        ) : (
          <>
            <TableHead cols={COLS}>
              <span>KIND</span>
              <span>SUBMISSION</span>
              <span>CLIENT</span>
              <span>ASSIGNED</span>
              <span>AGE</span>
              <span>STATUS</span>
            </TableHead>
            {pageRows.map((s, i) => {
              const days = ageDays(s.createdAt);
              return (
                <TableRow
                  cols={COLS}
                  key={s.id}
                  last={i === pageRows.length - 1}
                  innerRef={(el) => {
                    if (el) rowRefs.current.set(s.id, el);
                    else rowRefs.current.delete(s.id);
                  }}
                  className={clsx(
                    "transition-colors duration-700",
                    highlighted === s.id && "bg-coral-tint"
                  )}
                >
                  <Pill tone={s.kind === "issue" ? "blocked" : s.kind === "change_request" ? "watch" : "idle"} className="justify-self-start">
                    {KIND_LABEL[s.kind] ?? s.kind.toUpperCase()}
                  </Pill>
                  <SubmissionDetailButton submission={s} people={people}>
                    <CellStack
                      primary={s.title}
                      secondary={[
                        s.serviceName,
                        s.severity,
                        s.priority,
                        s.attachmentCount > 0 ? `${s.attachmentCount} FILE${s.attachmentCount === 1 ? "" : "S"}` : null,
                        s.needsClientNotice ? "🔔 NOTIFY CLIENT" : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                        .toUpperCase()}
                    />
                  </SubmissionDetailButton>
                  <span className="text-[11.5px] text-muted truncate">{s.clientName}</span>
                  <SubmissionAssigneeSelect submissionId={s.id} assigneePersonId={s.assigneePersonId} people={people} />
                  <span className={`font-mono text-[9.5px] ${days > 3 && s.status !== "resolved" ? "text-warn-fg" : "text-muted"}`}>{days}d</span>
                  <SubmissionStatusSelect submissionId={s.id} status={s.status} />
                </TableRow>
              );
            })}
          </>
        )}
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9.5px] text-muted">
            PAGE {currentPage + 1} OF {totalPages} · {filtered.length} SUBMISSION{filtered.length === 1 ? "" : "S"}
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
