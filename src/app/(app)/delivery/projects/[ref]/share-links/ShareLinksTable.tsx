"use client";

import { Pill } from "@/components/ui/Pill";
import { TableHead, TableRow, CellStack } from "@/components/ui/Table";
import { FilterablePagedList, type FilterPillDef } from "@/components/ui/FilterablePagedList";
import type { ShareLinkRow } from "@/lib/data/project";
import { ShareLinkActions } from "./ShareLinkActions";

const COLS = "1fr 84px 66px 78px 280px";

const FILTERS: FilterPillDef<ShareLinkRow>[] = [
  { key: "active", label: "Active", predicate: (l) => l.status === "active" },
  { key: "revoked", label: "Revoked", predicate: (l) => l.status === "revoked" },
  { key: "expired", label: "Expired", predicate: (l) => l.status === "expired" },
];

export function ShareLinksTable({ links, projectRef }: { links: ShareLinkRow[]; projectRef: string }) {
  return (
    <FilterablePagedList
      rows={links}
      searchPlaceholder="Search links by token or creator..."
      searchMatch={(l, q) => l.token.toLowerCase().includes(q) || l.createdByName.toLowerCase().includes(q)}
      filters={FILTERS}
      defaultFilterKey="active"
      emptyTitle="No links created."
      emptyDescription="Use a link for a stakeholder who should not have a portal account, like a board member or a site manager."
      itemNounSingular="LINK"
      itemNounPlural="LINKS"
      renderHead={() => (
        <TableHead cols={COLS}>
          <span>LINK</span>
          <span>EXPIRES</span>
          <span>VIEWS</span>
          <span>STATUS</span>
          <span>ACTIONS</span>
        </TableHead>
      )}
      renderRow={(l, i, isLast) => (
        <TableRow cols={COLS} key={l.id} last={isLast}>
          <CellStack primary={`/s/${l.token}`} secondary={`CREATED BY ${l.createdByName.toUpperCase()}`} />
          <span className="font-mono text-[9.5px] text-muted">{l.expiresAt?.slice(0, 10) ?? "—"}</span>
          <span className="font-mono text-[9.5px] text-muted">{l.viewCount}</span>
          <Pill tone={l.status === "active" ? "done" : "idle"} className="justify-self-start">
            {l.status.toUpperCase()}
          </Pill>
          <ShareLinkActions linkId={l.id} token={l.token} projectRef={projectRef} status={l.status} />
        </TableRow>
      )}
    />
  );
}
