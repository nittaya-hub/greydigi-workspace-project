import Link from "next/link";
import Image from "next/image";
import { Card, StatTile } from "@/components/ui/Card";
import { HealthPill } from "@/components/ui/Pill";
import { DashboardPortalView } from "@/components/dashboard/DashboardPortalView";
import type { PortalClientProjectsResult } from "@/lib/data/portal";
import type { DashboardBlockRow } from "@/lib/dashboard/service";
import type { DashboardData } from "@/lib/dashboard/types";

interface SpaceDashboard {
  blocks: DashboardBlockRow[];
  data: DashboardData;
  published: boolean;
}

/** The client-facing landing page — one card per active delivery project
 * (e.g. a Singapore engagement now, a Hong Kong one later, always shown
 * even when there's only one so this page needs no further change the
 * day a second project exists), plus this client's Hypercare dashboard
 * and the workspace's one Product dashboard, each only if an admin has
 * actually published one. One link for a client to see status across
 * all three spaces, per the original ask. */
export function ClientProjectsRollup({
  result,
  hypercare,
  product,
}: {
  result: PortalClientProjectsResult;
  hypercare?: SpaceDashboard;
  product?: SpaceDashboard;
}) {
  const projects = result.projects ?? [];

  return (
    <div className="min-h-dvh bg-paper flex flex-col">
      <header className="flex items-center gap-3 px-4 sm:px-6 py-3.5 border-b border-line bg-paper/90">
        <Image src="/greydigi-logo.png" alt="greydigi" width={22} height={22} className="rounded-[6px]" />
        <span className="font-display font-extrabold text-[14px]">greydigi</span>
        <span className="w-px h-[18px] bg-line" />
        <span className="text-[12.5px] text-muted">{result.client_name}</span>
      </header>

      <main className="flex-1 px-4 sm:px-6 py-7 sm:py-9 max-w-[880px] w-full mx-auto flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="w-[34px] h-[3px] bg-coral rounded-[2px]" />
          <h1 className="m-0 font-display font-extrabold tracking-[-0.02em] text-ink text-[23px]">
            {result.client_name}
          </h1>
          <p className="m-0 text-[12.5px] text-muted">Where each engagement stands right now.</p>
        </div>

        {projects.length === 0 ? (
          <Card className="p-6">
            <span className="text-[12.5px] text-muted">No active projects to show yet.</span>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {projects.map((p) => (
              <Link
                key={p.ref}
                href={`/portal/${p.ref.toLowerCase()}`}
                className="block bg-white border border-line rounded-[12px] p-4 flex flex-col gap-3 hover:border-coral transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[14px] font-semibold text-ink truncate">{p.name}</span>
                    <span className="font-mono text-[9.5px] text-muted">
                      {p.ref}
                      {p.current_phase ? ` · ${p.current_phase.name}` : ""}
                    </span>
                  </div>
                  <HealthPill health={p.health} className="flex-none" />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <StatTile label="PROGRESS" value={`${p.progress_pct}%`} />
                  <StatTile
                    label="GO-LIVE TARGET"
                    value={p.go_live_target ? new Date(p.go_live_target).toLocaleDateString() : "—"}
                  />
                </div>
              </Link>
            ))}
          </div>
        )}

        {hypercare?.published && hypercare.blocks.length > 0 ? (
          <DashboardPortalView title="SUPPORT" blocks={hypercare.blocks} data={hypercare.data} />
        ) : null}

        {product?.published && product.blocks.length > 0 ? (
          <DashboardPortalView title="PRODUCT" blocks={product.blocks} data={product.data} />
        ) : null}
      </main>
    </div>
  );
}
