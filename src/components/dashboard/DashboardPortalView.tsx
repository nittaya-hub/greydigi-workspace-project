import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import type { DashboardBlockRow } from "@/lib/dashboard/service";
import type { DashboardData } from "@/lib/dashboard/types";

/** The read-only, client-facing render of a published block dashboard —
 * same DashboardGrid component the admin editor uses, with dragging and
 * resizing turned off so a client sees exactly the layout that was
 * published. Callers decide when to use this vs. the legacy
 * ClientPortalView (see /portal/[ref]/page.tsx: only once a project has
 * a published dashboard with at least one block). */
export function DashboardPortalView({
  title,
  blocks,
  data,
}: {
  title: string;
  blocks: DashboardBlockRow[];
  data: DashboardData;
}) {
  return (
    <div className="flex flex-col gap-3">
      <span className="font-mono text-[9px] tracking-[.09em] text-muted">{title}</span>
      <DashboardGrid blocks={blocks} data={data} editable={false} />
    </div>
  );
}
