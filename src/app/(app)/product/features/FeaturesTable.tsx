"use client";

import Link from "next/link";
import { Pill } from "@/components/ui/Pill";
import { TableHead, TableRow } from "@/components/ui/Table";
import { FilterablePagedList, type FilterPillDef } from "@/components/ui/FilterablePagedList";
import type { FeatureRow } from "@/lib/data/product";
import { FeatureClientVisibleToggle } from "./FeatureClientVisibleToggle";

const COLS = "1fr 62px 1fr 96px 96px 78px";

const STATUS_TONE: Record<string, "idle" | "in_progress" | "done" | "waiting_on_client"> = {
  forecast: "idle",
  committed: "waiting_on_client",
  in_progress: "in_progress",
  done: "done",
};

const FILTERS: FilterPillDef<FeatureRow>[] = [
  { key: "in_progress", label: "In progress", predicate: (f) => f.status === "in_progress" },
  { key: "committed", label: "Committed", predicate: (f) => f.status === "committed" },
  { key: "done", label: "Done", predicate: (f) => f.status === "done" },
  { key: "forecast", label: "Forecast", predicate: (f) => f.status === "forecast" },
];

export function FeaturesTable({ features }: { features: FeatureRow[] }) {
  return (
    <FilterablePagedList
      rows={features}
      searchPlaceholder="Search features by title, ref or product..."
      searchMatch={(f, q) => f.title.toLowerCase().includes(q) || f.ref.toLowerCase().includes(q) || f.productName.toLowerCase().includes(q)}
      filters={FILTERS}
      emptyTitle="No features yet."
      emptyDescription="Features and epics appear here once added to a product's roadmap."
      itemNounSingular="FEATURE"
      itemNounPlural="FEATURES"
      renderHead={() => (
        <TableHead cols={COLS}>
          <span>FEATURE</span>
          <span>KIND</span>
          <span>PRODUCT</span>
          <span>RELEASE</span>
          <span>STATUS</span>
          <span>CLIENT</span>
        </TableHead>
      )}
      renderRow={(f, i, isLast) => (
        <TableRow cols={COLS} key={f.ref} last={isLast}>
          <Link href={`/product/features/${f.ref.toLowerCase()}`} className="min-w-0 flex flex-col gap-0.5">
            <span className="text-[12.5px] font-semibold text-ink truncate">{f.title}</span>
            <span className="font-mono text-[9.5px] text-muted">{f.ref}</span>
          </Link>
          <span className="font-mono text-[9.5px] text-muted">{f.kind.toUpperCase()}</span>
          <span className="text-muted truncate">{f.productName}</span>
          <span className="font-mono text-[9.5px] text-muted">{f.releaseCode ?? "—"}</span>
          <Pill tone={STATUS_TONE[f.status] ?? "idle"} className="justify-self-start">
            {f.status.replace(/_/g, " ").toUpperCase()}
          </Pill>
          <FeatureClientVisibleToggle itemId={f.id} itemRef={f.ref} initialOn={f.clientVisible} />
        </TableRow>
      )}
    />
  );
}
