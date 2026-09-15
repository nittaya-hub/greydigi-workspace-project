"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { EmptyState } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { TableHead, TableRow, CellStack } from "@/components/ui/Table";
import type { DocumentRow } from "@/lib/data/project";
import { documentKindGate, documentKindLabel } from "@/lib/flightplan/document-kinds";
import { DownloadDocumentLink } from "./DownloadDocumentLink";

const COLS = "1fr 48px 60px 96px 96px 84px";
const PAGE_SIZE = 20;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "2-digit" });
}

/** Search box + kind filter pills + 20-per-page pagination, same
 * client-side-over-a-server-sorted-list shape as AuditLogTable — rows
 * already arrive newest-first from getProjectDocuments, so page 1 always
 * shows the latest uploads regardless of the active filter or query. */
export function DocumentsTable({ documents }: { documents: DocumentRow[] }) {
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [page, setPage] = useState(0);

  const kinds = useMemo(() => [...new Set(documents.map((d) => d.kind))].sort(), [documents]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return documents.filter((d) => {
      if (kindFilter !== "all" && d.kind !== kindFilter) return false;
      if (!q) return true;
      return d.name.toLowerCase().includes(q) || documentKindLabel(d.kind).toLowerCase().includes(q);
    });
  }, [documents, query, kindFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  function setKindAndResetPage(next: string) {
    setKindFilter(next);
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
            placeholder="Search files by name or kind..."
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
            ALL {documents.length}
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
              {documentKindLabel(k).toUpperCase()} {documents.filter((d) => d.kind === k).length}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-line rounded-[12px] overflow-hidden">
        {pageRows.length === 0 ? (
          <EmptyState
            title={documents.length === 0 ? "No documents yet." : "No files match this search."}
            description={
              documents.length === 0
                ? "Uploaded artefacts and generated documents will appear here."
                : "Try a different name, kind or filter."
            }
          />
        ) : (
          <>
            <TableHead cols={COLS}>
              <span>ARTEFACT</span>
              <span>GATE</span>
              <span>VER</span>
              <span>VISIBILITY</span>
              <span>STATUS</span>
              <span>FILE</span>
            </TableHead>
            {pageRows.map((d, i) => {
              const gate = documentKindGate(d.kind);
              return (
                <TableRow cols={COLS} key={d.id} last={i === pageRows.length - 1}>
                  <CellStack primary={d.name} secondary={`${documentKindLabel(d.kind)} · ${formatDate(d.createdAt)}`} />
                  <span className="font-mono text-[9.5px] text-muted justify-self-start">{gate ?? "—"}</span>
                  <span className="font-mono text-[9.5px] text-muted">{d.version}</span>
                  <Pill tone={d.visibility === "client_visible" ? "waiting_on_client" : "idle"} className="justify-self-start">
                    {d.visibility === "client_visible" ? "CLIENT" : "INTERNAL"}
                  </Pill>
                  <Pill
                    tone={!d.requiresSignature ? "in_progress" : d.signedAt ? "done" : "blocked"}
                    className="justify-self-start"
                  >
                    {!d.requiresSignature ? "CURRENT" : d.signedAt ? "SIGNED" : "UNSIGNED"}
                  </Pill>
                  {d.storagePath ? (
                    <DownloadDocumentLink storagePath={d.storagePath} />
                  ) : (
                    <span className="font-mono text-[9px] text-muted-2 justify-self-start">NO FILE</span>
                  )}
                </TableRow>
              );
            })}
          </>
        )}
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9.5px] text-muted">
            PAGE {currentPage + 1} OF {totalPages} · {filtered.length} FILE{filtered.length === 1 ? "" : "S"}
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
