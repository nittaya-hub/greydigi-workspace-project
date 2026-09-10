"use client";

import { TableHead, TableRow, CellStack } from "@/components/ui/Table";
import { FilterablePagedList, type FilterPillDef } from "@/components/ui/FilterablePagedList";

const PROJECT_COLS = "1fr 1fr 130px 110px";

export interface ProjectGrantRow {
  id: string;
  role: string;
  createdAt: string;
  projectLabel: string;
  fullName: string;
}

const PROJECT_FILTERS: FilterPillDef<ProjectGrantRow>[] = [
  { key: "project_admin", label: "Project admin", predicate: (r) => r.role === "project_admin" },
  { key: "member", label: "Member", predicate: (r) => r.role !== "project_admin" },
];

export function ProjectGrantsTable({ rows }: { rows: ProjectGrantRow[] }) {
  return (
    <FilterablePagedList
      rows={rows}
      searchPlaceholder="Search grants by person or project..."
      searchMatch={(r, q) => r.fullName.toLowerCase().includes(q) || r.projectLabel.toLowerCase().includes(q)}
      filters={PROJECT_FILTERS}
      emptyTitle="No project-level grants yet."
      emptyDescription="Everyone with workspace_admin already has full access. Add a Project Admin or Member from a project's Members tab."
      itemNounSingular="GRANT"
      itemNounPlural="GRANTS"
      renderHead={() => (
        <TableHead cols={PROJECT_COLS}>
          <span>PERSON</span>
          <span>PROJECT</span>
          <span>ROLE</span>
          <span>ADDED</span>
        </TableHead>
      )}
      renderRow={(r, i, isLast) => (
        <TableRow key={r.id} cols={PROJECT_COLS} last={isLast}>
          <CellStack primary={r.fullName} />
          <span className="text-[11.5px] text-muted truncate">{r.projectLabel}</span>
          <span className="font-mono text-[10px] text-muted">{r.role === "project_admin" ? "PROJECT ADMIN" : "MEMBER"}</span>
          <span className="font-mono text-[9.5px] text-muted">{r.createdAt.slice(0, 10)}</span>
        </TableRow>
      )}
    />
  );
}

export interface ProductGrantRow {
  id: string;
  createdAt: string;
  fullName: string;
}

export function ProductGrantsTable({ rows }: { rows: ProductGrantRow[] }) {
  return (
    <FilterablePagedList
      rows={rows}
      searchPlaceholder="Search by person..."
      searchMatch={(r, q) => r.fullName.toLowerCase().includes(q)}
      emptyTitle="Nobody has Product access yet."
      emptyDescription="Grant it from a person's row on the People page."
      itemNounSingular="GRANT"
      itemNounPlural="GRANTS"
      renderHead={() => (
        <TableHead cols="1fr 110px">
          <span>PERSON</span>
          <span>ADDED</span>
        </TableHead>
      )}
      renderRow={(r, i, isLast) => (
        <TableRow key={r.id} cols="1fr 110px" last={isLast}>
          <CellStack primary={r.fullName} />
          <span className="font-mono text-[9.5px] text-muted">{r.createdAt.slice(0, 10)}</span>
        </TableRow>
      )}
    />
  );
}
