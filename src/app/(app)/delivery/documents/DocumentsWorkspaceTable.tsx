"use client";

import Link from "next/link";
import { Pill } from "@/components/ui/Pill";
import { TableHead, TableRow, CellStack } from "@/components/ui/Table";
import { FilterablePagedList, type FilterPillDef } from "@/components/ui/FilterablePagedList";

const COLS = "1fr 1fr 62px 104px 104px";

export interface WorkspaceDocumentRow {
  id: string;
  name: string;
  kind: string;
  version: string;
  visibility: string;
  requiresSignature: boolean;
  signedAt: string | null;
  projectRef: string | null;
}

const FILTERS: FilterPillDef<WorkspaceDocumentRow>[] = [
  { key: "client_visible", label: "Client visible", predicate: (d) => d.visibility === "client_visible" },
  { key: "awaiting_signature", label: "Awaiting signature", predicate: (d) => d.requiresSignature && !d.signedAt },
];

export function DocumentsWorkspaceTable({ documents }: { documents: WorkspaceDocumentRow[] }) {
  return (
    <FilterablePagedList
      rows={documents}
      searchPlaceholder="Search documents by name, kind or project..."
      searchMatch={(d, q) =>
        d.name.toLowerCase().includes(q) || d.kind.toLowerCase().includes(q) || (d.projectRef?.toLowerCase().includes(q) ?? false)
      }
      filters={FILTERS}
      emptyTitle="No documents yet."
      emptyDescription="Uploaded artefacts and generated documents will appear here."
      itemNounSingular="DOCUMENT"
      itemNounPlural="DOCUMENTS"
      renderHead={() => (
        <TableHead cols={COLS}>
          <span>ARTEFACT</span>
          <span>PROJECT</span>
          <span>VER</span>
          <span>VISIBILITY</span>
          <span>STATUS</span>
        </TableHead>
      )}
      renderRow={(d, i, isLast) => (
        <TableRow cols={COLS} key={d.id} last={isLast}>
          <CellStack primary={d.name} secondary={d.kind.toUpperCase()} />
          {d.projectRef ? (
            <Link href={`/delivery/projects/${d.projectRef.toLowerCase()}/documents`} className="text-[12.5px] text-ink truncate">
              {d.projectRef}
            </Link>
          ) : (
            <span className="text-muted">Workspace-level</span>
          )}
          <span className="font-mono text-[9.5px] text-muted">{d.version}</span>
          <Pill tone={d.visibility === "client_visible" ? "waiting_on_client" : "idle"} className="justify-self-start">
            {d.visibility === "client_visible" ? "CLIENT" : "INTERNAL"}
          </Pill>
          <Pill tone={!d.requiresSignature ? "in_progress" : d.signedAt ? "done" : "blocked"} className="justify-self-start">
            {!d.requiresSignature ? "CURRENT" : d.signedAt ? "SIGNED" : "UNSIGNED"}
          </Pill>
        </TableRow>
      )}
    />
  );
}
