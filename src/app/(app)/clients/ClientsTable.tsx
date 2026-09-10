"use client";

import Link from "next/link";
import { Pill } from "@/components/ui/Pill";
import { TableHead, TableRow } from "@/components/ui/Table";
import { FilterablePagedList, type FilterPillDef } from "@/components/ui/FilterablePagedList";
import type { ClientRow } from "@/lib/data/clients";

const COLS = "1fr 74px 76px 96px";

const FILTERS: FilterPillDef<ClientRow>[] = [{ key: "at_risk", label: "At risk", predicate: (c) => c.hasAtRiskService }];

/** Keeps listClients' own alphabetical order -- a client roster is
 * looked up by name, not by when the client was added, the same
 * reasoning that keeps Releases sorted by target date instead of
 * creation date. */
export function ClientsTable({ clients }: { clients: ClientRow[] }) {
  return (
    <FilterablePagedList
      rows={clients}
      searchPlaceholder="Search clients by name..."
      searchMatch={(c, q) => c.name.toLowerCase().includes(q)}
      filters={FILTERS}
      emptyTitle="No clients yet."
      emptyDescription="A client is the anchor every project, service and person points to."
      itemNounSingular="CLIENT"
      itemNounPlural="CLIENTS"
      renderHead={() => (
        <TableHead cols={COLS}>
          <span>CLIENT</span>
          <span>PROJECTS</span>
          <span>SERVICES</span>
          <span>STATE</span>
        </TableHead>
      )}
      renderRow={(c, i, isLast) => (
        <TableRow cols={COLS} key={c.id} last={isLast}>
          <Link href={`/clients/${c.id}`} className="text-[12.5px] font-semibold text-ink">
            {c.name}
          </Link>
          <span className="font-mono text-[9.5px] text-muted">{c.projectCount}</span>
          <span className="font-mono text-[9.5px] text-muted">{c.serviceCount}</span>
          <Pill tone={c.hasAtRiskService ? "blocked" : "done"} className="justify-self-start">
            {c.hasAtRiskService ? "AT RISK" : "ACTIVE"}
          </Pill>
        </TableRow>
      )}
    />
  );
}
